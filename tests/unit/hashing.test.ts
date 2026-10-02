import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  computeHash,
  computeFileHash,
  assertFileHashMatches,
  ConcurrencyConflictError
} from '../../src/storage/hashing.js';

describe('Hashing & OCC', () => {
  const testDir = path.join(os.tmpdir(), `memorycard-test-hashing-${Date.now()}`);

  afterEach(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('calcula hash SHA-256 de forma determinística', () => {
    const text = 'test content';
    const hash1 = computeHash(text);
    const hash2 = computeHash(text);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('valida assertFileHashMatches com sucesso quando o hash coincide', async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
    const file = path.join(testDir, 'sample.txt');
    const content = 'Original text';
    await fs.promises.writeFile(file, content, 'utf-8');

    const originalHash = computeHash(content);
    await expect(assertFileHashMatches(file, originalHash)).resolves.not.toThrow();
  });

  it('lança ConcurrencyConflictError quando o conteúdo do arquivo mudou', async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
    const file = path.join(testDir, 'sample.txt');
    await fs.promises.writeFile(file, 'Original text', 'utf-8');
    const oldHash = computeHash('Original text');

    // Modificação externa simulada
    await fs.promises.writeFile(file, 'Modified text by agent', 'utf-8');

    await expect(assertFileHashMatches(file, oldHash)).rejects.toThrow(ConcurrencyConflictError);
  });
});
