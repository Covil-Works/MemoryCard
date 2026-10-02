import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectService } from '../../src/core/services/project-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { TodoService, InvalidTodoIndexError } from '../../src/core/services/todo-service.js';

describe('TodoService', () => {
  let testProjectDir: string;
  let taskId: number;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-todo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await ProjectService.initProject(testProjectDir, 'Todo Project');
    const task = await TaskService.createTask(testProjectDir, { title: 'Task with Todos' });
    taskId = task.id;
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch {}
  });

  it('adiciona novo todo desmarcado', async () => {
    const updated = await TodoService.addTodo(testProjectDir, taskId, 'Primeiro passo');
    expect(updated.todos).toHaveLength(1);
    expect(updated.todos[0]).toEqual({ text: 'Primeiro passo', completed: false });
  });

  it('marca todo como concluído por índice 1-based', async () => {
    await TodoService.addTodo(testProjectDir, taskId, 'Passo 1');
    await TodoService.addTodo(testProjectDir, taskId, 'Passo 2');

    const updated = await TodoService.doneTodo(testProjectDir, taskId, 2);
    expect(updated.todos[1].completed).toBe(true);
    expect(updated.todos[0].completed).toBe(false);
  });

  it('desmarca todo concluído por índice 1-based', async () => {
    await TodoService.addTodo(testProjectDir, taskId, 'Passo 1');
    await TodoService.doneTodo(testProjectDir, taskId, 1);

    const updated = await TodoService.undoTodo(testProjectDir, taskId, 1);
    expect(updated.todos[0].completed).toBe(false);
  });

  it('remove todo por índice 1-based', async () => {
    await TodoService.addTodo(testProjectDir, taskId, 'Passo 1');
    await TodoService.addTodo(testProjectDir, taskId, 'Passo 2');

    const updated = await TodoService.removeTodo(testProjectDir, taskId, 1);
    expect(updated.todos).toHaveLength(1);
    expect(updated.todos[0].text).toBe('Passo 2');
  });

  it('lança InvalidTodoIndexError para índice fora da faixa', async () => {
    await expect(TodoService.doneTodo(testProjectDir, taskId, 1)).rejects.toThrow(InvalidTodoIndexError);
    await expect(TodoService.doneTodo(testProjectDir, taskId, 0)).rejects.toThrow(InvalidTodoIndexError);
  });
});
