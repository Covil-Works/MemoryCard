import { Column } from '../domain/project.js';
import { readProjectConfig, writeProjectConfig } from '../../storage/config-file.js';
import { listTaskIds, readTaskFile } from '../../storage/task-files.js';

export class StatusInUseError extends Error {
  constructor(statusId: string, taskCount: number) {
    super(
      `Não é possível remover o status "${statusId}" pois existem ${taskCount} task(s) vinculadas a ele. Mova as tasks antes de remover o status.`
    );
    this.name = 'StatusInUseError';
  }
}

export class StatusNotFoundError extends Error {
  constructor(statusId: string) {
    super(`Status "${statusId}" não encontrado nas colunas do projeto.`);
    this.name = 'StatusNotFoundError';
  }
}

export class StatusAlreadyExistsError extends Error {
  constructor(statusId: string) {
    super(`Já existe um status com o identificador "${statusId}".`);
    this.name = 'StatusAlreadyExistsError';
  }
}

export class StatusService {
  /**
   * Retorna a lista de status configurados ordenados por `order`.
   */
  static async listStatuses(projectRootDir: string): Promise<Column[]> {
    const { config } = await readProjectConfig(projectRootDir);
    return [...config.columns].sort((a, b) => a.order - b.order);
  }

  /**
   * Adiciona um novo status às colunas do projeto.
   */
  static async addStatus(projectRootDir: string, name: string, customId?: string): Promise<Column> {
    const { config, hash } = await readProjectConfig(projectRootDir);

    const trimmedName = name.trim();
    const id = customId?.trim() || trimmedName.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

    if (config.columns.some(c => c.id === id)) {
      throw new StatusAlreadyExistsError(id);
    }

    const maxOrder = config.columns.length > 0 ? Math.max(...config.columns.map(c => c.order)) : -1;
    const newColumn: Column = {
      id,
      name: trimmedName,
      order: maxOrder + 1
    };

    config.columns.push(newColumn);
    await writeProjectConfig(projectRootDir, config, hash);

    return newColumn;
  }

  /**
   * Renomeia o nome de exibição de um status existente.
   */
  static async renameStatus(projectRootDir: string, id: string, newName: string): Promise<Column> {
    const { config, hash } = await readProjectConfig(projectRootDir);

    const column = config.columns.find(c => c.id === id);
    if (!column) {
      throw new StatusNotFoundError(id);
    }

    column.name = newName.trim();
    await writeProjectConfig(projectRootDir, config, hash);

    return column;
  }

  /**
   * Remove um status se nenhuma task estiver usando ele.
   */
  static async removeStatus(projectRootDir: string, id: string): Promise<void> {
    const { config, hash } = await readProjectConfig(projectRootDir);

    const columnIndex = config.columns.findIndex(c => c.id === id);
    if (columnIndex === -1) {
      throw new StatusNotFoundError(id);
    }

    // Valida se existem tasks vinculadas
    const taskIds = await listTaskIds(projectRootDir);
    let linkedTasks = 0;
    for (const taskId of taskIds) {
      try {
        const { task } = await readTaskFile(projectRootDir, taskId);
        if (task.status === id) {
          linkedTasks++;
        }
      } catch {}
    }

    if (linkedTasks > 0) {
      throw new StatusInUseError(id, linkedTasks);
    }

    config.columns.splice(columnIndex, 1);
    // Reordena ordens restantes
    config.columns.forEach((col, idx) => {
      col.order = idx;
    });

    await writeProjectConfig(projectRootDir, config, hash);
  }
}
