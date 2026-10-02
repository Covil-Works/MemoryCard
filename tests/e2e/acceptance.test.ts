import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createCli } from '../../src/cli/index.js';
import { ProjectService } from '../../src/core/services/project-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { ModelService } from '../../src/core/services/model-service.js';
import { DEFAULT_MODEL_TEMPLATE } from '../../src/core/domain/model.js';
import { ConcurrencyConflictError } from '../../src/storage/hashing.js';
import { readProjectConfig } from '../../src/storage/config-file.js';
import { readTaskFile } from '../../src/storage/task-files.js';

describe('End-to-End Acceptance Test (§37.3)', () => {
  let testProjectDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    cli.exitOverride();
    await cli.parseAsync(['node', 'memorycard', ...args]);
  }

  it('executa o fluxo completo de aceitação: init -> CLI create -> UI read/edit -> OCC conflict -> Model create/select/task', async () => {
    // 1. init projeto via CLI
    await runCli(['init', 'E2E Project']);
    const { config } = await readProjectConfig(testProjectDir);
    expect(config.project.name).toBe('E2E Project');
    expect(fs.existsSync(path.join(testProjectDir, '.memorycard', 'config.json'))).toBe(true);

    // 2. criar task via CLI
    await runCli(['create', 'Implementar Login', '-d', 'Descrição inicial da task']);
    const { task: createdTask, hash: hashV1 } = await readTaskFile(testProjectDir, 1);
    expect(createdTask.id).toBe(1);
    expect(createdTask.title).toBe('Implementar Login');
    expect(createdTask.status).toBe('todo');

    // 3. UI/API carrega e edita a task
    const taskLoadedInUi = await TaskService.getTask(testProjectDir, 1);
    expect(taskLoadedInUi.description).toBe('Descrição inicial da task');

    // UI salva alterações (versão 2)
    const taskV2 = await TaskService.updateTask(
      testProjectDir,
      1,
      {
        description: 'Descrição atualizada pelo humano na UI'
      },
      hashV1
    );
    expect(taskV2.description).toBe('Descrição atualizada pelo humano na UI');
    const hashV2 = taskV2.hash;

    // 4. Agente de IA altera a task externamente via CLI
    await runCli(['todo', 'add', '1', 'Passo adicionado pelo agente']);
    const { task: taskAfterAgent, hash: hashV3 } = await readTaskFile(testProjectDir, 1);
    expect(taskAfterAgent.todos).toHaveLength(1);
    expect(hashV3).not.toBe(hashV2);

    // 5. Provocar conflito de edição na UI:
    // Tenta salvar usando o hashV2 (que já foi invalidado pela alteração do agente)
    await expect(
      TaskService.updateTask(
        testProjectDir,
        1,
        {
          title: 'Tentativa de sobrescrita conflitante'
        },
        hashV2
      )
    ).rejects.toThrow(ConcurrencyConflictError);

    // 6. Criar modelo pela UI a partir de cópia do default.md com seção extra
    const sddModelContent = `${DEFAULT_MODEL_TEMPLATE}\n## Architecture Decisions\n\n{{decisions}}\n`;
    await ModelService.createModel('sdd', 'project', sddModelContent, testProjectDir);

    // 7. Selecionar o novo modelo no projeto (task_model)
    await ProjectService.setTaskModel(testProjectDir, 'sdd');
    const updatedConfig = (await readProjectConfig(testProjectDir)).config;
    expect(updatedConfig.task_model).toBe('sdd');

    // 8. Criar nova task e confirmar que ela herda a estrutura do novo modelo
    await runCli(['create', 'Refatorar Storage', '-d', 'Task usando modelo SDD']);
    const { task: task2 } = await readTaskFile(testProjectDir, 2);
    expect(task2.id).toBe(2);
    expect(task2.title).toBe('Refatorar Storage');
    expect(task2.customSections.some(s => s.heading.includes('Architecture Decisions'))).toBe(true);

    // 9. Validar resume da task para coding agent
    const resume = await TaskService.getResumeTask(testProjectDir, 2);
    expect(resume).toContain('# Task 2: Refatorar Storage');
    expect(resume).toContain('Architecture Decisions');
  });
});
