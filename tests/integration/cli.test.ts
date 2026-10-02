import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createCli } from '../../src/cli/index.js';
import { readProjectConfig } from '../../src/storage/config-file.js';
import { listTaskIds, readTaskFile } from '../../src/storage/task-files.js';

describe('CLI Integration Tests', () => {
  let testProjectDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.promises.mkdir(testProjectDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testProjectDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch {}
  });

  async function runCli(args: string[]): Promise<void> {
    const cli = createCli();
    cli.exitOverride(); // Não encerra o processo do Vitest em caso de erro
    await cli.parseAsync(['node', 'memorycard', ...args]);
  }

  it('executa o ciclo completo de CLI: init -> create -> show -> edit -> move -> todo -> comment -> delete', async () => {
    // 1. memorycard init
    await runCli(['init', 'CLI Test Project']);
    const { config } = await readProjectConfig(testProjectDir);
    expect(config.project.name).toBe('CLI Test Project');

    // 2. memorycard create
    await runCli(['create', 'Minha Primeira Tarefa', '-d', 'Descrição inicial']);
    const idsAfterCreate = await listTaskIds(testProjectDir);
    expect(idsAfterCreate).toEqual([1]);

    const { task: task1 } = await readTaskFile(testProjectDir, 1);
    expect(task1.title).toBe('Minha Primeira Tarefa');
    expect(task1.description).toBe('Descrição inicial');
    expect(task1.status).toBe('todo');

    // 3. memorycard edit
    await runCli(['edit', '1', '-t', 'Tarefa Atualizada', '-d', 'Nova descrição']);
    const { task: taskEdited } = await readTaskFile(testProjectDir, 1);
    expect(taskEdited.title).toBe('Tarefa Atualizada');
    expect(taskEdited.description).toBe('Nova descrição');

    // 4. memorycard move
    await runCli(['move', '1', 'in-progress']);
    const { task: taskMoved } = await readTaskFile(testProjectDir, 1);
    expect(taskMoved.status).toBe('in-progress');

    // 5. memorycard todo add / done / undo / remove
    await runCli(['todo', 'add', '1', 'Checklist 1']);
    await runCli(['todo', 'add', '1', 'Checklist 2']);
    let taskTodos = (await readTaskFile(testProjectDir, 1)).task;
    expect(taskTodos.todos).toHaveLength(2);

    await runCli(['todo', 'done', '1', '1']);
    taskTodos = (await readTaskFile(testProjectDir, 1)).task;
    expect(taskTodos.todos[0].completed).toBe(true);

    await runCli(['todo', 'undo', '1', '1']);
    taskTodos = (await readTaskFile(testProjectDir, 1)).task;
    expect(taskTodos.todos[0].completed).toBe(false);

    await runCli(['todo', 'remove', '1', '2']);
    taskTodos = (await readTaskFile(testProjectDir, 1)).task;
    expect(taskTodos.todos).toHaveLength(1);

    // 6. memorycard comment
    await runCli(['comment', '1', 'Comentário via CLI']);
    const taskComment = (await readTaskFile(testProjectDir, 1)).task;
    expect(taskComment.comments).toHaveLength(1);
    expect(taskComment.comments[0].text).toBe('Comentário via CLI');

    // 7. memorycard status add / rename
    await runCli(['status', 'add', 'Testing']);
    const configWithStatus = (await readProjectConfig(testProjectDir)).config;
    expect(configWithStatus.columns.some(c => c.name === 'Testing')).toBe(true);

    await runCli(['status', 'rename', 'testing', 'QA']);
    const configRenamed = (await readProjectConfig(testProjectDir)).config;
    expect(configRenamed.columns.some(c => c.name === 'QA')).toBe(true);

    // 8. memorycard delete -y
    await runCli(['delete', '1', '-y']);
    const idsAfterDelete = await listTaskIds(testProjectDir);
    expect(idsAfterDelete).toHaveLength(0);

    // Contador next_task_id não deve regredir
    const configAfterDel = (await readProjectConfig(testProjectDir)).config;
    expect(configAfterDel.next_task_id).toBe(2);
  });
});
