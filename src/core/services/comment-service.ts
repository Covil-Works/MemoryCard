import { Task } from '../domain/task.js';
import { readTaskFile, writeTaskFile } from '../../storage/task-files.js';
import { formatLocalISO, formatCommentTimestamp } from '../utils/date.js';

export class CommentService {
  /**
   * Adiciona um novo comentário com timestamp local ao final de ## Comments.
   */
  static async addComment(
    projectRootDir: string,
    taskId: number,
    text: string,
    expectedHash?: string
  ): Promise<Task> {
    const { task } = await readTaskFile(projectRootDir, taskId);

    const timestamp = formatCommentTimestamp(new Date());

    task.comments.push({
      timestamp,
      text: text.trim()
    });

    task.updated_at = formatLocalISO(new Date());

    const { task: savedTask } = await writeTaskFile(projectRootDir, task, expectedHash);
    return savedTask;
  }
}
