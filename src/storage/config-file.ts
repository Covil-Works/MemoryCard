import fs from 'node:fs';
import path from 'node:path';
import { ProjectConfig } from '../core/domain/project.js';
import { atomicWriteFile } from './atomic-write.js';
import { assertFileHashMatches, computeHash } from './hashing.js';

export class InvalidProjectConfigError extends Error {
  constructor(message: string) {
    super(`Arquivo config.json inválido: ${message}`);
    this.name = 'InvalidProjectConfigError';
  }
}

export function getConfigFilePath(projectRootDir: string): string {
  return path.join(projectRootDir, '.memorycard', 'config.json');
}

export function createDefaultConfig(projectId: string, projectName: string): ProjectConfig {
  return {
    project: {
      id: projectId,
      name: projectName
    },
    next_task_id: 1,
    columns: [
      { id: 'todo', name: 'Todo', order: 0 },
      { id: 'in-progress', name: 'In Progress', order: 1 },
      { id: 'done', name: 'Done', order: 2 }
    ],
    board: {
      sort: 'updated_at'
    },
    task_model: 'default'
  };
}

export async function readProjectConfig(projectRootDir: string): Promise<{ config: ProjectConfig; hash: string }> {
  const filePath = getConfigFilePath(projectRootDir);

  let rawContent: string;
  try {
    rawContent = await fs.promises.readFile(filePath, 'utf-8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new InvalidProjectConfigError(`Arquivo não encontrado em "${filePath}"`);
    }
    throw err;
  }

  let config: any;
  try {
    config = JSON.parse(rawContent);
  } catch (err: any) {
    throw new InvalidProjectConfigError(`JSON corrompido: ${err.message}`);
  }

  if (!config.project || !config.project.id || !config.project.name) {
    throw new InvalidProjectConfigError('Campo "project" obrigatório ausente ou incompleto');
  }

  if (typeof config.next_task_id !== 'number') {
    throw new InvalidProjectConfigError('Campo "next_task_id" deve ser numérico');
  }

  if (!Array.isArray(config.columns)) {
    throw new InvalidProjectConfigError('Campo "columns" deve ser um array');
  }

  if (!config.board || !config.board.sort) {
    throw new InvalidProjectConfigError('Campo "board.sort" ausente');
  }

  if (!config.task_model) {
    config.task_model = 'default';
  }

  const hash = computeHash(rawContent);
  return { config: config as ProjectConfig, hash };
}

export async function writeProjectConfig(
  projectRootDir: string,
  config: ProjectConfig,
  expectedHash?: string
): Promise<string> {
  const filePath = getConfigFilePath(projectRootDir);
  await assertFileHashMatches(filePath, expectedHash);

  const content = JSON.stringify(config, null, 2) + '\n';
  await atomicWriteFile(filePath, content);

  return computeHash(content);
}
