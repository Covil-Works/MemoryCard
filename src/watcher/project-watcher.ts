import chokidar, { FSWatcher } from 'chokidar';
import path from 'node:path';
import { eventBus } from './event-bus.js';
import { getGlobalModelsDir } from '../storage/project-registry.js';
import { readProjectConfig } from '../storage/config-file.js';

export class ProjectWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly debounceMs = 100;

  constructor(
    private readonly projectRootDir: string,
    private projectId?: string
  ) {}

  async start(): Promise<void> {
    if (!this.projectId) {
      try {
        const { config } = await readProjectConfig(this.projectRootDir);
        this.projectId = config.project.id;
      } catch {
        this.projectId = 'unknown-project';
      }
    }

    const memoryCardDir = path.join(this.projectRootDir, '.memorycard');
    const tasksDir = path.join(memoryCardDir, 'tasks');
    const modelsDir = path.join(memoryCardDir, 'models');
    const configPath = path.join(memoryCardDir, 'config.json');
    const globalModelsDir = getGlobalModelsDir();

    this.watcher = chokidar.watch(
      [tasksDir, modelsDir, configPath, globalModelsDir],
      {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 20
        },
        ignored: (p: string) => p.endsWith('.tmp')
      }
    );

    this.watcher.on('add', (filePath) => this.handleFileEvent('add', filePath));
    this.watcher.on('change', (filePath) => this.handleFileEvent('change', filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileEvent('unlink', filePath));
  }

  private handleFileEvent(action: 'add' | 'change' | 'unlink', filePath: string): void {
    const key = `${action}:${filePath}`;
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.processFileEvent(action, filePath);
    }, this.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  private processFileEvent(action: 'add' | 'change' | 'unlink', filePath: string): void {
    const normalized = path.normalize(filePath);
    const basename = path.basename(normalized);

    // 1. Alteração em config.json
    if (basename === 'config.json') {
      eventBus.emitEvent('config-updated', {
        project_id: this.projectId!
      });
      return;
    }

    // 2. Alteração em tasks/<id>.md
    const taskMatch = basename.match(/^(\d+)\.md$/);
    if (taskMatch) {
      const taskId = Number(taskMatch[1]);
      if (action === 'add') {
        eventBus.emitEvent('task-created', {
          project_id: this.projectId!,
          task_id: taskId
        });
      } else if (action === 'change') {
        eventBus.emitEvent('task-updated', {
          project_id: this.projectId!,
          task_id: taskId
        });
      } else if (action === 'unlink') {
        eventBus.emitEvent('task-deleted', {
          project_id: this.projectId!,
          task_id: taskId
        });
      }
      return;
    }

    // 3. Alteração em models/<name>.md
    if (basename.endsWith('.md')) {
      const modelName = basename.replace(/\.md$/, '');
      eventBus.emitEvent('model-updated', {
        project_id: this.projectId!,
        model_name: modelName
      });
    }
  }

  async stop(): Promise<void> {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
