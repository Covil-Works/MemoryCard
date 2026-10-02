import fs from 'node:fs';
import path from 'node:path';
import { ProjectResolvedInfo } from '../core/domain/project.js';
import { readProjectConfig } from '../storage/config-file.js';
import { generateProjectSlug } from '../core/utils/slug.js';

export class ProjectNotFoundError extends Error {
  constructor(startDir: string) {
    super(
      `Nenhum projeto MemoryCard encontrado em "${startDir}" ou em seus diretórios pais. Execute "memorycard init" para inicializar um projeto.`
    );
    this.name = 'ProjectNotFoundError';
  }
}

/**
 * Procura o projeto MemoryCard atual subindo na árvore de diretórios (walk-up)
 * a partir de startDir até encontrar um .memorycard/config.json ou atingir a raiz.
 */
export async function resolveProject(startDir: string = process.cwd()): Promise<ProjectResolvedInfo> {
  let current = path.resolve(startDir);

  while (true) {
    const configPath = path.join(current, '.memorycard', 'config.json');

    if (fs.existsSync(configPath)) {
      const { config } = await readProjectConfig(current);
      return {
        rootDir: current,
        configPath,
        config,
        slug: generateProjectSlug(config.project.name)
      };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Chegou à raiz do sistema de arquivos
      throw new ProjectNotFoundError(startDir);
    }
    current = parent;
  }
}
