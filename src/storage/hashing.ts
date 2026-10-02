import crypto from 'node:crypto';
import fs from 'node:fs';

/**
 * Erro disparado quando o hash esperado difere do hash atual no arquivo,
 * indicando que o arquivo foi modificado externamente (OCC).
 */
export class ConcurrencyConflictError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly expectedHash?: string,
    public readonly actualHash?: string
  ) {
    super(
      `Conflito de concorrência no arquivo "${filePath}": o conteúdo foi alterado externamente. Recarregue antes de salvar.`
    );
    this.name = 'ConcurrencyConflictError';
  }
}

/**
 * Calcula o hash SHA-256 do conteúdo fornecido em string.
 */
export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Lê o arquivo do disco e calcula seu hash SHA-256.
 * Retorna null caso o arquivo não exista.
 */
export async function computeFileHash(filePath: string): Promise<string | null> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return computeHash(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Valida o hash esperado com o hash atual do arquivo.
 * Lança ConcurrencyConflictError se divergirem.
 */
export async function assertFileHashMatches(filePath: string, expectedHash?: string): Promise<void> {
  if (!expectedHash) {
    return;
  }
  const currentHash = await computeFileHash(filePath);
  if (currentHash !== null && currentHash !== expectedHash) {
    throw new ConcurrencyConflictError(filePath, expectedHash, currentHash);
  }
}
