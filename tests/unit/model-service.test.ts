import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectService } from '../../src/core/services/project-service.js';
import { ModelService } from '../../src/core/services/model-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { DEFAULT_MODEL_TEMPLATE } from '../../src/core/domain/model.js';

describe('ModelService', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = path.join(os.tmpdir(), `memorycard-test-model-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await ProjectService.initProject(testProjectDir, 'Model Project');
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch {}
  });

  it('resolve o modelo padrão global default.md', async () => {
    const defaultModel = await ModelService.getDefaultModel();
    expect(defaultModel.name).toBe('default');
    expect(defaultModel.scope).toBe('global');
    expect(defaultModel.content).toContain('{{id}}');
  });

  it('permite criar modelo local no projeto e utilizá-lo na criação de task', async () => {
    const customContent = `${DEFAULT_MODEL_TEMPLATE}\n## Acceptance Criteria\n\n- Critério 1\n`;
    await ModelService.createModel('feature', 'project', customContent, testProjectDir);

    const task = await TaskService.createTask(testProjectDir, {
      title: 'Task com modelo feature',
      modelName: 'feature'
    });

    const read = await TaskService.getTask(testProjectDir, task.id);
    expect(read.customSections.some(s => s.heading.includes('Acceptance Criteria'))).toBe(true);
  });

  it('impede criação de novo modelo com nome reservado default', async () => {
    await expect(
      ModelService.createModel('default', 'project', DEFAULT_MODEL_TEMPLATE, testProjectDir)
    ).rejects.toThrow('reservado');
  });
});
