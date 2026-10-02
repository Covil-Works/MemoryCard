import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ProjectConfig, ProjectResolvedInfo, BoardSort } from '../domain/project.js';
import { createDefaultConfig, writeProjectConfig, readProjectConfig } from '../../storage/config-file.js';
import { registerProjectInGlobalRegistry, ensureGlobalMemoryCardStructure } from '../../storage/project-registry.js';
import { resolveProject } from '../../project-resolution/resolve-project.js';
import { generateProjectSlug } from '../utils/slug.js';

export class ProjectAlreadyInitializedError extends Error {
  constructor(dir: string) {
    super(`O diretório "${dir}" já está inicializado como um projeto MemoryCard.`);
    this.name = 'ProjectAlreadyInitializedError';
  }
}

export class ProjectService {
  /**
   * Inicializa um novo projeto MemoryCard no diretório indicado:
   * - Cria .memorycard/
   * - Cria .memorycard/tasks/
   * - Cria .memorycard/models/
   * - Cria .memorycard/config.json com UUID único
   * - Registra no índice global ~/.memorycard/projects.json
   */
  static async initProject(targetDir: string = process.cwd(), projectName?: string): Promise<ProjectResolvedInfo> {
    const resolvedDir = path.resolve(targetDir);
    await fs.promises.mkdir(resolvedDir, { recursive: true });

    const memoryCardDir = path.join(resolvedDir, '.memorycard');
    const configPath = path.join(memoryCardDir, 'config.json');

    if (fs.existsSync(configPath)) {
      throw new ProjectAlreadyInitializedError(resolvedDir);
    }

    const tasksDir = path.join(memoryCardDir, 'tasks');
    const modelsDir = path.join(memoryCardDir, 'models');

    await fs.promises.mkdir(tasksDir, { recursive: true });
    await fs.promises.mkdir(modelsDir, { recursive: true });

    const finalName = projectName?.trim() || path.basename(resolvedDir) || 'Projeto';
    const projectId = crypto.randomUUID();
    const config = createDefaultConfig(projectId, finalName);

    await writeProjectConfig(resolvedDir, config);
    await ensureGlobalMemoryCardStructure();
    await registerProjectInGlobalRegistry(projectId, resolvedDir);

    return {
      rootDir: resolvedDir,
      configPath,
      config,
      slug: generateProjectSlug(finalName)
    };
  }

  /**
   * Resolve o projeto a partir de startDir ou cwd.
   */
  static async getProject(startDir: string = process.cwd()): Promise<ProjectResolvedInfo> {
    return resolveProject(startDir);
  }

  /**
   * Altera a ordenação padrão do board do projeto.
   */
  static async setBoardSort(projectRootDir: string, sort: BoardSort): Promise<ProjectConfig> {
    const { config, hash } = await readProjectConfig(projectRootDir);
    config.board.sort = sort;
    await writeProjectConfig(projectRootDir, config, hash);
    return config;
  }

  /**
   * Altera o modelo padrão de task do projeto (task_model).
   */
  static async setTaskModel(projectRootDir: string, modelName: string): Promise<ProjectConfig> {
    const { config, hash } = await readProjectConfig(projectRootDir);
    config.task_model = modelName;
    await writeProjectConfig(projectRootDir, config, hash);
    return config;
  }
}
