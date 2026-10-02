import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectService } from '../../src/core/services/project-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { ConcurrencyConflictError } from '../../src/storage/hashing.js';
import { readProjectConfig } from '../../src/storage/config-file.js';

describe('TaskService', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-tasks-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await ProjectService.initProject(testProjectDir, 'Test Project');
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch {}
  });

  it('cria a primeira task com ID 1 e atualiza next_task_id para 2', async () => {
    const task = await TaskService.createTask(testProjectDir, {
      title: 'Minha primeira task',
      description: 'Descrição inicial'
    });

    expect(task.id).toBe(1);
    expect(task.title).toBe('Minha primeira task');
    expect(task.status).toBe('todo');

    const { config } = await readProjectConfig(testProjectDir);
    expect(config.next_task_id).toBe(2);
  });

  it('recupera inconsistência de ID se o arquivo de destino já existir sem retroceder contador', async () => {
    // Cria task 1 normalmente
    await TaskService.createTask(testProjectDir, { title: 'Task 1' });

    // Simula colisão criando manualmente 2.md e 3.md no filesystem
    const task2Path = path.join(testProjectDir, '.memorycard', 'tasks', '2.md');
    const task3Path = path.join(testProjectDir, '.memorycard', 'tasks', '3.md');
    const dummyTask = `---
id: 2
title: Manual
status: todo
position: 0
created_at: 2026-10-02T12:00:00Z
updated_at: 2026-10-02T12:00:00Z
---
# Manual
## Description
## Todo
## Comments
`;
    await fs.promises.writeFile(task2Path, dummyTask, 'utf-8');
    await fs.promises.writeFile(task3Path, dummyTask.replace('id: 2', 'id: 3'), 'utf-8');

    // Ao criar a próxima task, deve detectar colisão e saltar para 4
    const task = await TaskService.createTask(testProjectDir, { title: 'Auto Recovered Task' });
    expect(task.id).toBe(4);

    const { config } = await readProjectConfig(testProjectDir);
    expect(config.next_task_id).toBe(5);
  });

  it('apagar task não reduz o contador next_task_id (§14.1)', async () => {
    const task = await TaskService.createTask(testProjectDir, { title: 'Para Deletar' });
    expect(task.id).toBe(1);

    await TaskService.deleteTask(testProjectDir, 1);

    const { config } = await readProjectConfig(testProjectDir);
    expect(config.next_task_id).toBe(2);

    const nextTask = await TaskService.createTask(testProjectDir, { title: 'Nova Task' });
    expect(nextTask.id).toBe(2);
  });

  it('bloqueia atualização com ConcurrencyConflictError se o hash for diferente (OCC)', async () => {
    const task = await TaskService.createTask(testProjectDir, { title: 'Task Concorrente' });
    const originalHash = task.hash;

    // Simula modificação concorrente externa
    await TaskService.updateTask(testProjectDir, task.id, { title: 'Modificada por agente' });

    // Tentativa de salvar sobre a versão antiga com o originalHash deve falhar
    await expect(
      TaskService.updateTask(testProjectDir, task.id, { title: 'Tentativa Conflitante' }, originalHash)
    ).rejects.toThrow(ConcurrencyConflictError);
  });

  it('move task entre status e ajusta positions', async () => {
    const task = await TaskService.createTask(testProjectDir, { title: 'Task Move' });
    expect(task.status).toBe('todo');

    const moved = await TaskService.moveTask(testProjectDir, task.id, 'in-progress');
    expect(moved.status).toBe('in-progress');
  });

  it('getCurrentTask retorna a task in-progress mais recentemente atualizada', async () => {
    const t1 = await TaskService.createTask(testProjectDir, { title: 'Task 1' });
    const t2 = await TaskService.createTask(testProjectDir, { title: 'Task 2' });

    await TaskService.moveTask(testProjectDir, t1.id, 'in-progress');
    // Dá um tempo para updated_at ser posterior
    await new Promise(r => setTimeout(r, 10));
    await TaskService.moveTask(testProjectDir, t2.id, 'in-progress');

    const current = await TaskService.getCurrentTask(testProjectDir);
    expect(current?.id).toBe(t2.id);
  });

  it('getResumeTask formata a task para consumo de coding agent', async () => {
    const task = await TaskService.createTask(testProjectDir, {
      title: 'Implementar Auth',
      description: 'Implementar login JWT'
    });

    const resume = await TaskService.getResumeTask(testProjectDir, task.id);
    expect(resume).toContain('# Task 1: Implementar Auth');
    expect(resume).toContain('Implementar login JWT');
    expect(resume).toContain('Checklist (Todo)');
  });
});
