import path from 'node:path';
import { Task } from '../domain/task.js';
import { BoardSort } from '../domain/project.js';
import { formatLocalISO } from '../utils/date.js';
import { renderModelTemplate } from '../parser/markdown-model.js';
import { parseTaskMarkdown } from '../parser/markdown-task.js';
import { readProjectConfig, writeProjectConfig } from '../../storage/config-file.js';
import {
  readTaskFile,
  writeTaskFile,
  deleteTaskFile,
  listTaskIds,
  getTaskFilePath
} from '../../storage/task-files.js';
import { resolveModel } from '../../storage/model-files.js';
import fs from 'node:fs';

export class InvalidStatusError extends Error {
  constructor(status: string) {
    super(`Status "${status}" não existe nas colunas configuradas para o projeto.`);
    this.name = 'InvalidStatusError';
  }
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: string;
  todo?: string;
  comments?: string;
  modelName?: string;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: string;
  position?: number;
}

export class TaskService {
  /**
   * Resolve o próximo ID de task respeitando a monotonicidade e recuperando colisões.
   * §14: Se <next_task_id>.md existir, calcula max(existing_ids) + 1 e nunca reduz.
   */
  static async resolveNextTaskId(projectRootDir: string, currentNextId: number): Promise<{ id: number; nextId: number }> {
    const existingIds = await listTaskIds(projectRootDir);
    const candidatePath = getTaskFilePath(projectRootDir, currentNextId);

    if (!fs.existsSync(candidatePath)) {
      return { id: currentNextId, nextId: currentNextId + 1 };
    }

    // Colisão detectada: recupera inconsistência
    const maxExisting = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const recoveredId = Math.max(maxExisting, currentNextId) + 1;

    return { id: recoveredId, nextId: recoveredId + 1 };
  }

  /**
   * Cria uma nova task utilizando modelo e atomic write ordenado.
   */
  static async createTask(projectRootDir: string, params: CreateTaskParams): Promise<Task> {
    const { config, hash: configHash } = await readProjectConfig(projectRootDir);

    const modelName = params.modelName || config.task_model || 'default';
    const model = await resolveModel(modelName, projectRootDir);

    const status = params.status || (config.columns.length > 0 ? config.columns[0].id : 'todo');
    const statusExists = config.columns.some(col => col.id === status);
    if (!statusExists) {
      throw new InvalidStatusError(status);
    }

    const { id, nextId } = await this.resolveNextTaskId(projectRootDir, config.next_task_id);

    // Calcula posição no final da coluna indicada
    const allTasks = await this.listTasks(projectRootDir);
    const columnTasks = allTasks.filter(t => t.status === status);
    const maxPosition = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position)) : -1;
    const position = maxPosition + 1;

    const now = formatLocalISO(new Date());

    const rendered = renderModelTemplate(model.content, {
      id,
      title: params.title.trim(),
      status,
      position,
      created_at: now,
      updated_at: now,
      description: params.description,
      todo: params.todo,
      comments: params.comments
    });

    const parsedTask = parseTaskMarkdown(rendered);

    // 1. Escreve arquivo da task atomicamente primeiro (§36.2)
    const { task: savedTask } = await writeTaskFile(projectRootDir, parsedTask);

    // 2. Atualiza next_task_id no config.json
    config.next_task_id = nextId;
    await writeProjectConfig(projectRootDir, config, configHash);

    return savedTask;
  }

  /**
   * Obtém os dados completos de uma task pelo ID.
   */
  static async getTask(projectRootDir: string, taskId: number): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);
    return task;
  }

  /**
   * Lista todas as tasks do projeto com opção de ordenação e filtro de status.
   */
  static async listTasks(
    projectRootDir: string,
    options?: { sort?: BoardSort; status?: string }
  ): Promise<Task[]> {
    const ids = await listTaskIds(projectRootDir);
    const tasks: Task[] = [];

    for (const id of ids) {
      try {
        const { task } = await readTaskFile(projectRootDir, id);
        tasks.push(task);
      } catch {
        // Ignora task inválida ou corrompida na listagem geral
      }
    }

    let filtered = tasks;
    if (options?.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }

    const sortType = options?.sort || 'updated_at';

    if (sortType === 'updated_at') {
      filtered.sort((a, b) => {
        const timeDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id - a.id;
      });
    } else if (sortType === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortType === 'custom') {
      filtered.sort((a, b) => a.position - b.position);
    }

    return filtered;
  }

  /**
   * Atualiza campos específicos da task com checagem OCC por hash.
   */
  static async updateTask(
    projectRootDir: string,
    taskId: number,
    updates: UpdateTaskParams,
    expectedHash?: string
  ): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);

    if (updates.status !== undefined && updates.status !== task.status) {
      const { config } = await readProjectConfig(projectRootDir);
      const statusExists = config.columns.some(c => c.id === updates.status);
      if (!statusExists) {
        throw new InvalidStatusError(updates.status);
      }
      task.status = updates.status;
    }

    if (updates.title !== undefined) {
      task.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      task.description = updates.description.trim();
    }

    if (updates.position !== undefined) {
      task.position = updates.position;
    }

    task.updated_at = formatLocalISO(new Date());

    const { task: updatedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return updatedTask;
  }

  /**
   * Move a task para um status/coluna e ajusta posições.
   */
  static async moveTask(
    projectRootDir: string,
    taskId: number,
    targetStatus: string,
    newPosition?: number,
    expectedHash?: string
  ): Promise<Task> {
    const { config } = await readProjectConfig(projectRootDir);
    const statusExists = config.columns.some(c => c.id === targetStatus);
    if (!statusExists) {
      throw new InvalidStatusError(targetStatus);
    }

    const { task } = await readTaskFile(projectRootDir, taskId);

    let position = newPosition;
    if (position === undefined) {
      const columnTasks = (await this.listTasks(projectRootDir, { status: targetStatus }))
        .filter(t => t.id !== taskId);
      const maxPos = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position)) : -1;
      position = maxPos + 1;
    }

    task.status = targetStatus;
    task.position = position;
    task.updated_at = formatLocalISO(new Date());

    const { task: movedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return movedTask;
  }

  /**
   * Exclui a task. Não reutiliza nem diminui o contador next_task_id (§14.1).
   */
  static async deleteTask(projectRootDir: string, taskId: number): Promise<void> {
    await deleteTaskFile(projectRootDir, taskId);
  }

  /**
   * Retorna a task em status "in-progress" mais recentemente atualizada (§26).
   */
  static async getCurrentTask(projectRootDir: string): Promise<Task | null> {
    const inProgressTasks = await this.listTasks(projectRootDir, {
      status: 'in-progress',
      sort: 'updated_at'
    });

    return inProgressTasks.length > 0 ? inProgressTasks[0] : null;
  }

  /**
   * Retorna a task formatada para retomada por um coding agent (§26).
   */
  static async getResumeTask(projectRootDir: string, taskId: number): Promise<string> {
    const { task } = await readTaskFile(projectRootDir, taskId);

    let output = `# Task ${task.id}: ${task.title}\n`;
    output += `Status: ${task.status} | Updated: ${task.updated_at}\n\n`;

    output += `## Description\n${task.description || '(Sem descrição)'}\n\n`;

    output += `## Checklist (Todo)\n`;
    if (task.todos.length === 0) {
      output += `(Nenhum todo registrado)\n\n`;
    } else {
      task.todos.forEach((todo, idx) => {
        const mark = todo.completed ? '[x]' : '[ ]';
        output += `${idx + 1}. ${mark} ${todo.text}\n`;
      });
      output += '\n';
    }

    output += `## Comments\n`;
    if (task.comments.length === 0) {
      output += `(Nenhum comentário registrado)\n`;
    } else {
      for (const comment of task.comments) {
        output += `### ${comment.timestamp}\n${comment.text}\n\n`;
      }
    }

    if (task.customSections.length > 0) {
      for (const sec of task.customSections) {
        output += `${sec.heading}\n${sec.content}\n\n`;
      }
    }

    return output.trim();
  }
}
