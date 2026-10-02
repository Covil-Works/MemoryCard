import fs from 'node:fs';
import path from 'node:path';
import { Task } from '../core/domain/task.js';
import { parseTaskMarkdown, serializeTaskMarkdown } from '../core/parser/markdown-task.js';
import { atomicWriteFile } from './atomic-write.js';
import { assertFileHashMatches, computeHash } from './hashing.js';

export class TaskNotFoundError extends Error {
  constructor(public readonly taskId: number) {
    super(`Task com ID ${taskId} não foi encontrada.`);
    this.name = 'TaskNotFoundError';
  }
}

export function getTaskDirectory(projectRootDir: string): string {
  return path.join(projectRootDir, '.memorycard', 'tasks');
}

export function getTaskFilePath(projectRootDir: string, taskId: number): string {
  return path.join(getTaskDirectory(projectRootDir), `${taskId}.md`);
}

/**
 * Retorna todos os IDs de tasks existentes no projeto, ordenados numericamente.
 */
export async function listTaskIds(projectRootDir: string): Promise<number[]> {
  const dir = getTaskDirectory(projectRootDir);
  try {
    const files = await fs.promises.readdir(dir);
    const ids: number[] = [];
    for (const file of files) {
      const match = file.match(/^(\d+)\.md$/);
      if (match) {
        ids.push(Number(match[1]));
      }
    }
    return ids.sort((a, b) => a - b);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Lê e analisa o arquivo Markdown de uma task específica.
 */
export async function readTaskFile(
  projectRootDir: string,
  taskId: number
): Promise<{ task: Task; hash: string }> {
  const filePath = getTaskFilePath(projectRootDir, taskId);

  let rawContent: string;
  try {
    rawContent = await fs.promises.readFile(filePath, 'utf-8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new TaskNotFoundError(taskId);
    }
    throw err;
  }

  const hash = computeHash(rawContent);
  const task = parseTaskMarkdown(rawContent, hash);

  return { task, hash };
}

/**
 * Escreve atomicamente uma task com verificação opcional de hash OCC.
 */
export async function writeTaskFile(
  projectRootDir: string,
  task: Task,
  expectedHash?: string
): Promise<{ task: Task; hash: string }> {
  const filePath = getTaskFilePath(projectRootDir, task.id);

  await assertFileHashMatches(filePath, expectedHash);

  const serialized = serializeTaskMarkdown(task);
  await atomicWriteFile(filePath, serialized);

  const newHash = computeHash(serialized);
  task.hash = newHash;

  return { task, hash: newHash };
}

/**
 * Remove o arquivo físico da task.
 */
export async function deleteTaskFile(projectRootDir: string, taskId: number): Promise<void> {
  const filePath = getTaskFilePath(projectRootDir, taskId);
  try {
    await fs.promises.unlink(filePath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new TaskNotFoundError(taskId);
    }
    throw err;
  }
}
