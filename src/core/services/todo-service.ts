import { Task } from '../domain/task.js';
import { readTaskFile, writeTaskFile } from '../../storage/task-files.js';
import { formatLocalISO } from '../utils/date.js';

export class InvalidTodoIndexError extends Error {
  constructor(index: number, total: number) {
    super(`Índice de todo inválido: ${index}. Total de itens disponíveis: ${total}.`);
    this.name = 'InvalidTodoIndexError';
  }
}

export class TodoService {
  /**
   * Adiciona um novo item de todo desmarcado ao final da lista.
   */
  static async addTodo(
    projectRootDir: string,
    taskId: number,
    text: string,
    expectedHash?: string
  ): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);

    task.todos.push({
      text: text.trim(),
      completed: false
    });

    task.updated_at = formatLocalISO(new Date());

    const { task: savedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return savedTask;
  }

  /**
   * Marca o item no índice 1-based como concluído ([x]).
   */
  static async doneTodo(
    projectRootDir: string,
    taskId: number,
    oneBasedIndex: number,
    expectedHash?: string
  ): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);
    const zeroBased = oneBasedIndex - 1;

    if (zeroBased < 0 || zeroBased >= task.todos.length) {
      throw new InvalidTodoIndexError(oneBasedIndex, task.todos.length);
    }

    task.todos[zeroBased].completed = true;
    task.updated_at = formatLocalISO(new Date());

    const { task: savedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return savedTask;
  }

  /**
   * Desmarca o item no índice 1-based ([ ]).
   */
  static async undoTodo(
    projectRootDir: string,
    taskId: number,
    oneBasedIndex: number,
    expectedHash?: string
  ): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);
    const zeroBased = oneBasedIndex - 1;

    if (zeroBased < 0 || zeroBased >= task.todos.length) {
      throw new InvalidTodoIndexError(oneBasedIndex, task.todos.length);
    }

    task.todos[zeroBased].completed = false;
    task.updated_at = formatLocalISO(new Date());

    const { task: savedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return savedTask;
  }

  /**
   * Remove o item no índice 1-based.
   */
  static async removeTodo(
    projectRootDir: string,
    taskId: number,
    oneBasedIndex: number,
    expectedHash?: string
  ): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);
    const zeroBased = oneBasedIndex - 1;

    if (zeroBased < 0 || zeroBased >= task.todos.length) {
      throw new InvalidTodoIndexError(oneBasedIndex, task.todos.length);
    }

    task.todos.splice(zeroBased, 1);
    task.updated_at = formatLocalISO(new Date());

    const { task: savedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return savedTask;
  }
}
