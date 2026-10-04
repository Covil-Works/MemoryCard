import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

// Isola o diretório global do MemoryCard para cada execução de arquivo de teste
const testGlobalDir = path.join(
  os.tmpdir(),
  `memorycard-test-global-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

process.env.MEMORYCARD_GLOBAL_DIR = testGlobalDir;

afterAll(async () => {
  try {
    if (fs.existsSync(testGlobalDir)) {
      await fs.promises.rm(testGlobalDir, { recursive: true, force: true });
    }
  } catch {
    // Silencia erros de limpeza temporária
  }
});
