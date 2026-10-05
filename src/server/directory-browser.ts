import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface DirectoryEntry {
  name: string;
  path: string;
  isMemoryCard: boolean;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface SystemShortcut {
  name: string;
  path: string;
  type: 'cwd' | 'home' | 'drive' | 'root';
}

export interface DirectoryBrowseResult {
  currentPath: string;
  parentPath: string | null;
  breadcrumbs: BreadcrumbItem[];
  directories: DirectoryEntry[];
  shortcuts: SystemShortcut[];
  sep: string;
  isMemoryCard: boolean;
  error?: string;
}

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.next',
  '$recycle.bin',
  'system volume information',
  'recovery',
  'perflogs'
]);

/**
 * Retorna os atalhos padrão do sistema na ordem: Home do usuário, Drives/Raiz e Pasta Atual do terminal (CWD).
 */
export function getSystemShortcuts(): SystemShortcut[] {
  const shortcuts: SystemShortcut[] = [
    { name: 'Home (~)', path: os.homedir(), type: 'home' }
  ];

  if (os.platform() === 'win32') {
    for (let i = 65; i <= 90; i++) {
      const driveLetter = String.fromCharCode(i);
      const drivePath = `${driveLetter}:\\`;
      try {
        if (fs.existsSync(drivePath)) {
          shortcuts.push({ name: `${driveLetter}:`, path: drivePath, type: 'drive' });
        }
      } catch {
        // Ignora unidades inacessíveis
      }
    }
  } else {
    shortcuts.push({ name: 'Raiz (/)', path: '/', type: 'root' });
  }

  shortcuts.push({ name: 'Pasta Atual (CWD)', path: process.cwd(), type: 'cwd' });

  return shortcuts;
}

/**
 * Constrói a lista de segmentos navegáveis (breadcrumbs) a partir de um caminho absoluto.
 */
export function buildBreadcrumbs(targetPath: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  let curr = path.resolve(targetPath);

  while (true) {
    const parent = path.dirname(curr);
    const name = path.basename(curr) || curr;
    breadcrumbs.unshift({ name, path: curr });
    if (parent === curr) break;
    curr = parent;
  }

  return breadcrumbs;
}

/**
 * Navega e lista diretórios do sistema de arquivos de forma segura e multiplataforma.
 * Por padrão, inicia no diretório Home do usuário.
 */
export async function browseDirectory(requestedPath?: string): Promise<DirectoryBrowseResult> {
  const shortcuts = getSystemShortcuts();
  let resolvedPath = requestedPath?.trim()
    ? path.resolve(requestedPath.trim())
    : os.homedir();

  // Se o caminho não existir, tenta o diretório pai ou cai na Home
  if (!fs.existsSync(resolvedPath)) {
    const parent = path.dirname(resolvedPath);
    if (fs.existsSync(parent)) {
      resolvedPath = parent;
    } else {
      resolvedPath = os.homedir();
    }
  }

  // Se for um arquivo, assume o diretório pai
  try {
    const stat = await fs.promises.stat(resolvedPath);
    if (!stat.isDirectory()) {
      resolvedPath = path.dirname(resolvedPath);
    }
  } catch {
    resolvedPath = os.homedir();
  }

  const parent = path.dirname(resolvedPath);
  const parentPath = parent === resolvedPath ? null : parent;
  const breadcrumbs = buildBreadcrumbs(resolvedPath);

  let isCurrentMemoryCard = false;
  try {
    isCurrentMemoryCard = fs.existsSync(path.join(resolvedPath, '.memorycard', 'config.json'));
  } catch {
    isCurrentMemoryCard = false;
  }

  let dirents: fs.Dirent[] = [];
  let readError: string | undefined = undefined;

  try {
    dirents = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
  } catch (err: any) {
    readError = err.code === 'EACCES' || err.code === 'EPERM'
      ? 'Permissão negada para acessar este diretório.'
      : `Erro ao acessar diretório: ${err.message}`;
  }

  const directories: DirectoryEntry[] = [];
  if (!readError) {
    for (const dirent of dirents) {
      if (IGNORED_NAMES.has(dirent.name.toLowerCase())) continue;

      let isDir = false;
      if (dirent.isDirectory()) {
        isDir = true;
      } else if (dirent.isSymbolicLink()) {
        try {
          const stat = await fs.promises.stat(path.join(resolvedPath, dirent.name));
          isDir = stat.isDirectory();
        } catch {
          isDir = false;
        }
      }

      if (isDir) {
        const fullChildPath = path.join(resolvedPath, dirent.name);
        let isChildMemoryCard = false;
        try {
          isChildMemoryCard = fs.existsSync(path.join(fullChildPath, '.memorycard', 'config.json'));
        } catch {
          isChildMemoryCard = false;
        }

        directories.push({
          name: dirent.name,
          path: fullChildPath,
          isMemoryCard: isChildMemoryCard
        });
      }
    }

    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  return {
    currentPath: resolvedPath,
    parentPath,
    breadcrumbs,
    directories,
    shortcuts,
    sep: path.sep,
    isMemoryCard: isCurrentMemoryCard,
    error: readError
  };
}

/**
 * Cria um novo subdiretório no caminho especificado.
 */
export async function createDirectory(targetPath: string): Promise<{ success: boolean; path: string }> {
  const resolved = path.resolve(targetPath.trim());
  await fs.promises.mkdir(resolved, { recursive: true });
  return { success: true, path: resolved };
}
