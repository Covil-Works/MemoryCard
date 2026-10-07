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

export class ProjectAlreadyInListError extends ProjectAlreadyInitializedError {
  constructor(dir: string, name?: string) {
    super(dir);
    this.message = 'Este projeto já está sendo exibido na sua lista.';
    this.name = 'ProjectAlreadyInListError';
  }
}

export class ProjectService {
  /**
   * Inicializa um novo projeto MemoryCard no diretório indicado:
   * - Se o projeto não existe: cria estrutura, modelos e config.
   * - Se o projeto existe mas não está na lista: re-registra e preserva dados salvos.
   * - Se o projeto existe e já está na lista: lança ProjectAlreadyInListError.
   */
  static async initProject(targetDir: string = process.cwd(), projectName?: string): Promise<ProjectResolvedInfo & { reattached?: boolean }> {
    const resolvedDir = path.resolve(targetDir);
    await fs.promises.mkdir(resolvedDir, { recursive: true });

    const memoryCardDir = path.join(resolvedDir, '.memorycard');
    const configPath = path.join(memoryCardDir, 'config.json');

    if (fs.existsSync(configPath)) {
      // 1. Projeto já existe fisicamente nesta pasta
      // Verifica se ele já está sendo exibido no registro global (~/.memorycard/projects.json)
      const { readGlobalProjects } = await import('../../storage/project-registry.js');
      const { projects } = await readGlobalProjects();

      let existingConfig: any = null;
      try {
        const raw = await fs.promises.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(raw);
      } catch (err: any) {
        throw new Error(`Arquivo config.json do projeto existente está inválido: ${err.message}`);
      }

      const existingId = existingConfig?.project?.id;
      const normalizedResolved = resolvedDir.replace(/\\/g, '/').toLowerCase();
      const isAlreadyInList = projects.some(p => {
        const pathMatches = path.resolve(p.path).replace(/\\/g, '/').toLowerCase() === normalizedResolved;
        const idMatches = Boolean(existingId && p.project_id === existingId);
        return pathMatches || idMatches;
      });

      if (isAlreadyInList) {
        // Regra: Projeto existe + já está na lista -> mostrar aviso
        throw new ProjectAlreadyInListError(resolvedDir, existingConfig?.project?.name);
      }

      // Regra: Projeto existe + não está na lista -> carregar novamente preservando toda a estrutura
      await ensureGlobalMemoryCardStructure();
      await registerProjectInGlobalRegistry(existingId || crypto.randomUUID(), resolvedDir);

      return {
        rootDir: resolvedDir,
        configPath,
        config: existingConfig,
        slug: generateProjectSlug(existingConfig?.project?.name || path.basename(resolvedDir)),
        reattached: true
      };
    }

    // Regra: Projeto não existe -> criar normalmente
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
