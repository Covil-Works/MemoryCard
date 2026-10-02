import fs from 'node:fs';
import path from 'node:path';

async function renameWithRetry(source: string, target: string, maxRetries = 15): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.promises.rename(source, target);
      return;
    } catch (err: any) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 25 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Escreve um arquivo de forma atômica no mesmo diretório:
 * 1. Garante que o diretório pai existe
 * 2. Grava em um arquivo .tmp temporário
 * 3. Executa fsync para descarregar buffers no disco
 * 4. Executa rename atômico sobre o arquivo final (com retry para Windows)
 * 5. Remove o temporário em caso de falha
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;

  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(tempPath, 'w');
    await fileHandle.writeFile(content, 'utf-8');
    await fileHandle.sync();
    await fileHandle.close();
    fileHandle = null;

    await renameWithRetry(tempPath, filePath);
  } catch (error) {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {
        // Ignora erro de fechamento
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {
      // Ignora erro de limpeza
    }
    throw error;
  }
}
