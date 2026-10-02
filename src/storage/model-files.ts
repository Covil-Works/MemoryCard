import fs from 'node:fs';
import path from 'node:path';
import { TaskModel, ModelScope } from '../core/domain/model.js';
import { getGlobalModelsDir, getGlobalDefaultModelPath } from './project-registry.js';
import { validateModelTemplate, InvalidModelTemplateError } from '../core/parser/markdown-model.js';
import { atomicWriteFile } from './atomic-write.js';

export function getProjectModelsDir(projectRootDir: string): string {
  return path.join(projectRootDir, '.memorycard', 'models');
}

/**
 * Resolve e carrega o conteúdo de um modelo respeitando a hierarquia de escopo:
 * 1. "default" -> sempre global default.md
 * 2. outro nome -> primeiro no projeto, depois no global
 */
export async function resolveModel(
  modelName: string,
  projectRootDir?: string
): Promise<TaskModel> {
  const sanitizedName = modelName.trim().replace(/\.md$/, '');

  if (sanitizedName === 'default') {
    const globalDefaultPath = getGlobalDefaultModelPath();
    if (!fs.existsSync(globalDefaultPath)) {
      throw new Error('Modelo global default.md não encontrado.');
    }
    const content = await fs.promises.readFile(globalDefaultPath, 'utf-8');
    const validation = validateModelTemplate(content);
    if (!validation.valid) {
      throw new InvalidModelTemplateError(validation.errors);
    }
    return {
      name: 'default',
      scope: 'global',
      path: globalDefaultPath,
      content
    };
  }

  // 1. Procura no projeto
  if (projectRootDir) {
    const projectModelPath = path.join(getProjectModelsDir(projectRootDir), `${sanitizedName}.md`);
    if (fs.existsSync(projectModelPath)) {
      const content = await fs.promises.readFile(projectModelPath, 'utf-8');
      const validation = validateModelTemplate(content);
      if (!validation.valid) {
        throw new InvalidModelTemplateError(validation.errors);
      }
      return {
        name: sanitizedName,
        scope: 'project',
        path: projectModelPath,
        content
      };
    }
  }

  // 2. Procura no global
  const globalModelPath = path.join(getGlobalModelsDir(), `${sanitizedName}.md`);
  if (fs.existsSync(globalModelPath)) {
    const content = await fs.promises.readFile(globalModelPath, 'utf-8');
    const validation = validateModelTemplate(content);
    if (!validation.valid) {
      throw new InvalidModelTemplateError(validation.errors);
    }
    return {
      name: sanitizedName,
      scope: 'global',
      path: globalModelPath,
      content
    };
  }

  throw new Error(`Modelo "${modelName}" não encontrado localmente nem no registro global.`);
}

/**
 * Lista todos os modelos disponíveis para um projeto (globais + locais).
 */
export async function listAvailableModels(projectRootDir?: string): Promise<TaskModel[]> {
  const modelsMap = new Map<string, TaskModel>();

  // Globais
  const globalDir = getGlobalModelsDir();
  try {
    const files = await fs.promises.readdir(globalDir);
    for (const f of files) {
      if (f.endsWith('.md')) {
        const name = f.replace(/\.md$/, '');
        const fullPath = path.join(globalDir, f);
        try {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const validation = validateModelTemplate(content);
          if (validation.valid) {
            modelsMap.set(name, {
              name,
              scope: 'global',
              path: fullPath,
              content
            });
          }
        } catch {
          // Ignora modelo corrompido na listagem
        }
      }
    }
  } catch {
    // Diretório pode não existir ainda
  }

  // Locais do projeto
  if (projectRootDir) {
    const projectDir = getProjectModelsDir(projectRootDir);
    try {
      const files = await fs.promises.readdir(projectDir);
      for (const f of files) {
        if (f.endsWith('.md')) {
          const name = f.replace(/\.md$/, '');
          if (name === 'default') {
            continue; // default é reservado para o global
          }
          const fullPath = path.join(projectDir, f);
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            const validation = validateModelTemplate(content);
            if (validation.valid) {
              modelsMap.set(name, {
                name,
                scope: 'project',
                path: fullPath,
                content
              });
            }
          } catch {
            // Ignora modelo corrompido
          }
        }
      }
    } catch {
      // Diretório pode não existir
    }
  }

  return Array.from(modelsMap.values());
}

/**
 * Salva um novo modelo validando sua estrutura mínima obrigatória.
 * Não permite sobrescrever "default" ao criar modelo.
 */
export async function saveModelFile(
  name: string,
  scope: ModelScope,
  content: string,
  projectRootDir?: string
): Promise<TaskModel> {
  const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/\.md$/, '');

  if (!sanitizedName) {
    throw new Error('Nome do modelo inválido.');
  }

  if (sanitizedName === 'default') {
    throw new Error('O nome "default" é reservado para o modelo global base.');
  }

  const validation = validateModelTemplate(content);
  if (!validation.valid) {
    throw new InvalidModelTemplateError(validation.errors);
  }

  let targetDir: string;
  if (scope === 'project') {
    if (!projectRootDir) {
      throw new Error('Diretório do projeto não fornecido para modelo com escopo "project".');
    }
    targetDir = getProjectModelsDir(projectRootDir);
  } else {
    targetDir = getGlobalModelsDir();
  }

  const targetPath = path.join(targetDir, `${sanitizedName}.md`);
  await atomicWriteFile(targetPath, content.trim() + '\n');

  return {
    name: sanitizedName,
    scope,
    path: targetPath,
    content
  };
}
