import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { resolveProject, ProjectNotFoundError } from '../../src/project-resolution/resolve-project.js';
import { createDefaultConfig, writeProjectConfig } from '../../src/storage/config-file.js';

describe('resolveProject (walk-up)', () => {
  const testRoot = path.join(os.tmpdir(), `memorycard-test-walkup-${Date.now()}`);

  afterEach(async () => {
    try {
      await fs.promises.rm(testRoot, { recursive: true, force: true });
    } catch {}
  });

  it('encontra o projeto quando executado na própria raiz do projeto', async () => {
    const projectDir = path.join(testRoot, 'my-project');
    const config = createDefaultConfig('1234-uuid', 'My Project');
    await writeProjectConfig(projectDir, config);

    const resolved = await resolveProject(projectDir);
    expect(resolved.rootDir).toBe(projectDir);
    expect(resolved.config.project.name).toBe('My Project');
    expect(resolved.slug).toBe('my-project');
  });

  it('encontra o projeto navegando para cima a partir de um subdiretório profundo', async () => {
    const projectDir = path.join(testRoot, 'my-app');
    const deepSubdir = path.join(projectDir, 'src', 'components', 'buttons');
    await fs.promises.mkdir(deepSubdir, { recursive: true });

    const config = createDefaultConfig('5678-uuid', 'Deep App');
    await writeProjectConfig(projectDir, config);

    const resolved = await resolveProject(deepSubdir);
    expect(resolved.rootDir).toBe(projectDir);
    expect(resolved.config.project.id).toBe('5678-uuid');
  });

  it('lança ProjectNotFoundError se nenhum .memorycard for encontrado até a raiz', async () => {
    const emptyDir = path.join(testRoot, 'empty');
    await fs.promises.mkdir(emptyDir, { recursive: true });

    await expect(resolveProject(emptyDir)).rejects.toThrow(ProjectNotFoundError);
  });
});
