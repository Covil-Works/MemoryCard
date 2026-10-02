import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectService } from '../../src/core/services/project-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { StatusService, StatusInUseError } from '../../src/core/services/status-service.js';

describe('StatusService', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-status-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await ProjectService.initProject(testProjectDir, 'Status Project');
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch {}
  });

  it('lista as colunas iniciais padrão (Todo, In Progress, Done)', async () => {
    const statuses = await StatusService.listStatuses(testProjectDir);
    expect(statuses.map(s => s.id)).toEqual(['todo', 'in-progress', 'done']);
  });

  it('adiciona uma nova coluna customizada', async () => {
    const col = await StatusService.addStatus(testProjectDir, 'Review');
    expect(col.id).toBe('review');
    expect(col.name).toBe('Review');

    const statuses = await StatusService.listStatuses(testProjectDir);
    expect(statuses.some(s => s.id === 'review')).toBe(true);
  });

  it('renomeia uma coluna existente', async () => {
    await StatusService.renameStatus(testProjectDir, 'in-progress', 'Doing');
    const statuses = await StatusService.listStatuses(testProjectDir);
    const inProgress = statuses.find(s => s.id === 'in-progress');
    expect(inProgress?.name).toBe('Doing');
  });

  it('impede a remoção de status que contenha tasks vinculadas', async () => {
    await TaskService.createTask(testProjectDir, { title: 'Task in Todo', status: 'todo' });

    await expect(StatusService.removeStatus(testProjectDir, 'todo')).rejects.toThrow(StatusInUseError);
  });

  it('remove status sem tasks com sucesso', async () => {
    await StatusService.addStatus(testProjectDir, 'Temporário', 'temp');
    await StatusService.removeStatus(testProjectDir, 'temp');

    const statuses = await StatusService.listStatuses(testProjectDir);
    expect(statuses.some(s => s.id === 'temp')).toBe(false);
  });
});
