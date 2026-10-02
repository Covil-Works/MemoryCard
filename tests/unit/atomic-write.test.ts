import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { atomicWriteFile } from '../../src/storage/atomic-write.js';

describe('atomicWriteFile', () => {
  const testDir = path.join(os.tmpdir(), `memorycard-test-atomic-${Date.now()}`);

  afterEach(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('escreve o arquivo com sucesso criando diretórios pai', async () => {
    const targetFile = path.join(testDir, 'subdir', 'test.txt');
    const content = 'Hello MemoryCard Atomic!';

    await atomicWriteFile(targetFile, content);

    expect(fs.existsSync(targetFile)).toBe(true);
    const read = await fs.promises.readFile(targetFile, 'utf-8');
    expect(read).toBe(content);
  });

  it('não deixa arquivos .tmp residuais após escrita bem-sucedida', async () => {
    const targetFile = path.join(testDir, 'clean.txt');
    await atomicWriteFile(targetFile, 'Content');

    const files = await fs.promises.readdir(testDir);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
    expect(tmpFiles.length).toBe(0);
  });
});
