import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  registerProjectInGlobalRegistry,
  readGlobalProjects,
  unregisterProjectFromGlobalRegistry,
  getGlobalMemoryCardDir,
  getGlobalProjectsJsonPath
} from '../../src/storage/project-registry.js';

describe('ProjectRegistry storage', () => {
  it('grava e lê no diretório global isolado', async () => {
    const globalDir = getGlobalMemoryCardDir();
    expect(globalDir).toContain('memorycard-test-global');

    const testId = 'test-proj-123';
    const testPath = path.join(os.tmpdir(), 'dummy-proj');

    await registerProjectInGlobalRegistry(testId, testPath);
    const { projects } = await readGlobalProjects();

    const found = projects.find(p => p.project_id === testId);
    expect(found).toBeDefined();
    expect(found?.path).toBe(path.resolve(testPath));
    expect(found?.available).toBe(false);
  });

  it('desregistra projeto existente com sucesso', async () => {
    const testId = 'test-proj-to-remove';
    const testPath = path.join(os.tmpdir(), 'dummy-proj-remove');

    await registerProjectInGlobalRegistry(testId, testPath);
    let { projects } = await readGlobalProjects();
    expect(projects.some(p => p.project_id === testId)).toBe(true);

    const removed = await unregisterProjectFromGlobalRegistry(testId);
    expect(removed).toBe(true);

    const after = await readGlobalProjects();
    expect(after.projects.some(p => p.project_id === testId)).toBe(false);
  });

  it('retorna false ao desregistrar projeto inexistente', async () => {
    const removed = await unregisterProjectFromGlobalRegistry('non-existent-id');
    expect(removed).toBe(false);
  });
});
