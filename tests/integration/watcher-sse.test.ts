import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectService } from '../../src/core/services/project-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { ProjectWatcher } from '../../src/watcher/project-watcher.js';
import { eventBus, MemoryCardEvent } from '../../src/watcher/event-bus.js';

describe('ProjectWatcher & EventBus', () => {
  let testProjectDir: string;
  let watcher: ProjectWatcher;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-watcher-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const project = await ProjectService.initProject(testProjectDir, 'Watcher Test');
    watcher = new ProjectWatcher(testProjectDir, project.config.project.id);
    await watcher.start();
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
    }
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch {}
  });

  it('emite evento task-created quando uma nova task é criada no disco', async () => {
    const receivedEvents: MemoryCardEvent[] = [];
    const handler = (e: MemoryCardEvent) => receivedEvents.push(e);
    eventBus.onEvent(handler);

    try {
      await TaskService.createTask(testProjectDir, { title: 'Nova Task Watcher' });

      // Aguarda o debounce do watcher (100ms + margem)
      await new Promise(r => setTimeout(r, 350));

      const createdEvent = receivedEvents.find(e => e.type === 'task-created' && e.payload.task_id === 1);
      expect(createdEvent).toBeDefined();
    } finally {
      eventBus.offEvent(handler);
    }
  });

  it('emite evento task-deleted quando uma task é excluída', async () => {
    const task = await TaskService.createTask(testProjectDir, { title: 'Task Para Apagar' });
    await new Promise(r => setTimeout(r, 200));

    const receivedEvents: MemoryCardEvent[] = [];
    const handler = (e: MemoryCardEvent) => receivedEvents.push(e);
    eventBus.onEvent(handler);

    try {
      await TaskService.deleteTask(testProjectDir, task.id);

      await new Promise(r => setTimeout(r, 350));

      const deletedEvent = receivedEvents.find(e => e.type === 'task-deleted' && e.payload.task_id === task.id);
      expect(deletedEvent).toBeDefined();
    } finally {
      eventBus.offEvent(handler);
    }
  });
});
