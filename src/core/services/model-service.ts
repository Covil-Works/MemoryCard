import { TaskModel, ModelScope } from '../domain/model.js';
import {
  resolveModel,
  listAvailableModels,
  saveModelFile
} from '../../storage/model-files.js';
import { validateModelTemplate } from '../parser/markdown-model.js';

export class ModelService {
  /**
   * Obtém o modelo base padrão global (default.md).
   */
  static async getDefaultModel(): Promise<TaskModel> {
    return resolveModel('default');
  }

  /**
   * Resolve um modelo por nome (local do projeto ou global).
   */
  static async getModel(name: string, projectRootDir?: string): Promise<TaskModel> {
    return resolveModel(name, projectRootDir);
  }

  /**
   * Lista todos os modelos disponíveis para o projeto.
   */
  static async listModels(projectRootDir?: string): Promise<TaskModel[]> {
    return listAvailableModels(projectRootDir);
  }

  /**
   * Valida a conformidade da estrutura de um modelo.
   */
  static validate(content: string): { valid: boolean; errors: string[] } {
    return validateModelTemplate(content);
  }

  /**
   * Cria um novo modelo a partir de uma cópia editada do default.md.
   */
  static async createModel(
    name: string,
    scope: ModelScope,
    content: string,
    projectRootDir?: string
  ): Promise<TaskModel> {
    return saveModelFile(name, scope, content, projectRootDir);
  }
}
