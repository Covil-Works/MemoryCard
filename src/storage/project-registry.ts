import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GlobalProjectEntry, GlobalProjectsRegistry } from '../core/domain/project.js';
import { DEFAULT_MODEL_TEMPLATE } from '../core/domain/model.js';
import { generateProjectSlug } from '../core/utils/slug.js';
import { atomicWriteFile } from './atomic-write.js';
import { computeHash } from './hashing.js';

export function getGlobalMemoryCardDir(): string {
  return process.env.MEMORYCARD_GLOBAL_DIR || path.join(os.homedir(), '.memorycard');
}

export function getGlobalProjectsJsonPath(): string {
  return path.join(getGlobalMemoryCardDir(), 'projects.json');
}

export function getGlobalModelsDir(): string {
  return path.join(getGlobalMemoryCardDir(), 'models');
}

export function getGlobalDefaultModelPath(): string {
  return path.join(getGlobalModelsDir(), 'default.md');
}

/**
 * Garante que a estrutura global ~/.memorycard/ exista:
 * - ~/.memorycard/
 * - ~/.memorycard/projects.json
 * - ~/.memorycard/models/
 * - ~/.memorycard/models/default.md
 */
export async function ensureGlobalMemoryCardStructure(): Promise<void> {
  const baseDir = getGlobalMemoryCardDir();
  const modelsDir = getGlobalModelsDir();
  const projectsJsonPath = getGlobalProjectsJsonPath();
  const defaultModelPath = getGlobalDefaultModelPath();

  await fs.promises.mkdir(modelsDir, { recursive: true });

  if (!fs.existsSync(projectsJsonPath)) {
    const initialProjects: GlobalProjectsRegistry = { projects: [] };
    await atomicWriteFile(projectsJsonPath, JSON.stringify(initialProjects, null, 2) + '\n');
  }

  if (!fs.existsSync(defaultModelPath)) {
    await atomicWriteFile(defaultModelPath, DEFAULT_MODEL_TEMPLATE);
  }
}

export interface DetailedGlobalProject {
  project_id: string;
  path: string;
  available: boolean;
  name?: string;
  slug?: string;
}

/**
 * Lê o registro global de projetos e avalia a disponibilidade no filesystem.
 */
export async function readGlobalProjects(): Promise<{ projects: DetailedGlobalProject[]; hash: string }> {
  await ensureGlobalMemoryCardStructure();

  const projectsJsonPath = getGlobalProjectsJsonPath();
  const rawContent = await fs.promises.readFile(projectsJsonPath, 'utf-8');
  const hash = computeHash(rawContent);

  let data: GlobalProjectsRegistry;
  try {
    data = JSON.parse(rawContent);
    if (!data || !Array.isArray(data.projects)) {
      data = { projects: [] };
    }
  } catch {
    data = { projects: [] };
  }

  const detailedList: DetailedGlobalProject[] = [];

  for (const entry of data.projects) {
    const configPath = path.join(entry.path, '.memorycard', 'config.json');
    let available = false;
    let name: string | undefined;
    let slug: string | undefined;

    try {
      if (fs.existsSync(configPath)) {
        const configRaw = await fs.promises.readFile(configPath, 'utf-8');
        const configJson = JSON.parse(configRaw);
        if (configJson?.project?.name) {
          name = configJson.project.name;
          slug = generateProjectSlug(name);
          available = true;
        }
      }
    } catch {
      available = false;
    }

    detailedList.push({
      project_id: entry.project_id,
      path: entry.path,
      available,
      name: name || path.basename(entry.path),
      slug: slug || generateProjectSlug(path.basename(entry.path))
    });
  }

  return { projects: detailedList, hash };
}

/**
 * Registra ou atualiza um projeto no índice global ~/.memorycard/projects.json.
 */
export async function registerProjectInGlobalRegistry(projectId: string, projectPath: string): Promise<void> {
  await ensureGlobalMemoryCardStructure();

  const projectsJsonPath = getGlobalProjectsJsonPath();
  const resolvedPath = path.resolve(projectPath);

  let data: GlobalProjectsRegistry = { projects: [] };
  try {
    const rawContent = await fs.promises.readFile(projectsJsonPath, 'utf-8');
    data = JSON.parse(rawContent);
    if (!Array.isArray(data.projects)) {
      data = { projects: [] };
    }
  } catch {
    data = { projects: [] };
  }

  const existingIndex = data.projects.findIndex(p => p.project_id === projectId);
  if (existingIndex >= 0) {
    data.projects[existingIndex].path = resolvedPath;
  } else {
    data.projects.push({
      project_id: projectId,
      path: resolvedPath
    });
  }

  const outputContent = JSON.stringify(data, null, 2) + '\n';
  await atomicWriteFile(projectsJsonPath, outputContent);
}

export class ProjectRelinkError extends Error {
  constructor(message: string) {
    super(`Falha ao relincar projeto: ${message}`);
    this.name = 'ProjectRelinkError';
  }
}

/**
 * Relinca um projeto indisponível para um novo diretório, validando o project.id.
 */
export async function relinkProjectInGlobalRegistry(projectId: string, newPath: string): Promise<void> {
  await ensureGlobalMemoryCardStructure();

  const resolvedNewPath = path.resolve(newPath);
  const newConfigPath = path.join(resolvedNewPath, '.memorycard', 'config.json');

  if (!fs.existsSync(newConfigPath)) {
    throw new ProjectRelinkError(`Nenhum projeto MemoryCard encontrado em "${resolvedNewPath}"`);
  }

  let configJson: any;
  try {
    const rawConfig = await fs.promises.readFile(newConfigPath, 'utf-8');
    configJson = JSON.parse(rawConfig);
  } catch (err: any) {
    throw new ProjectRelinkError(`Arquivo config.json corrompido no novo caminho: ${err.message}`);
  }

  if (configJson?.project?.id !== projectId) {
    throw new ProjectRelinkError(
      `O project.id encontrado ("${configJson?.project?.id}") não corresponde ao projeto registrado ("${projectId}").`
    );
  }

  await registerProjectInGlobalRegistry(projectId, resolvedNewPath);
}

/**
 * Remove um projeto do índice global projects.json.
 * Não apaga os arquivos do projeto no disco, apenas o desregistra da listagem.
 */
export async function unregisterProjectFromGlobalRegistry(projectId: string): Promise<boolean> {
  await ensureGlobalMemoryCardStructure();

  const projectsJsonPath = getGlobalProjectsJsonPath();
  let data: GlobalProjectsRegistry = { projects: [] };

  try {
    const rawContent = await fs.promises.readFile(projectsJsonPath, 'utf-8');
    data = JSON.parse(rawContent);
    if (!Array.isArray(data.projects)) {
      data = { projects: [] };
    }
  } catch {
    data = { projects: [] };
  }

  const initialLength = data.projects.length;
  data.projects = data.projects.filter(p => p.project_id !== projectId);

  if (data.projects.length !== initialLength) {
    const outputContent = JSON.stringify(data, null, 2) + '\n';
    await atomicWriteFile(projectsJsonPath, outputContent);
    return true;
  }

  return false;
}
