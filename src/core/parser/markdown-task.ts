import YAML from 'yaml';
import { Task, TaskFrontmatter, TodoItem, CommentItem, CustomSection } from '../domain/task.js';

export class InvalidTaskMarkdownError extends Error {
  constructor(message: string) {
    super(`Arquivo de task inválido: ${message}`);
    this.name = 'InvalidTaskMarkdownError';
  }
}

/**
 * Faz o parsing de um conteúdo Markdown completo de task para a entidade Task.
 */
export function parseTaskMarkdown(content: string, hash?: string): Task {
  if (!content || typeof content !== 'string') {
    throw new InvalidTaskMarkdownError('Conteúdo vazio ou inválido');
  }

  // Normaliza quebras de linha Windows / Unix
  const normalized = content.replace(/\r\n/g, '\n');

  // Extrai frontmatter delimitado por ---
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new InvalidTaskMarkdownError('Frontmatter YAML não encontrado ou mal formatado');
  }

  const rawFrontmatter = frontmatterMatch[1];
  const rawBody = frontmatterMatch[2];

  let frontmatter: any;
  try {
    frontmatter = YAML.parse(rawFrontmatter);
  } catch (err: any) {
    throw new InvalidTaskMarkdownError(`Falha ao processar YAML: ${err.message}`);
  }

  // Validação dos campos obrigatórios do frontmatter (§33)
  const requiredFields: (keyof TaskFrontmatter)[] = [
    'id',
    'title',
    'status',
    'position',
    'created_at',
    'updated_at'
  ];

  for (const field of requiredFields) {
    if (frontmatter[field] === undefined || frontmatter[field] === null) {
      throw new InvalidTaskMarkdownError(`Campo obrigatório ausente no frontmatter: "${field}"`);
    }
  }

  const id = Number(frontmatter.id);
  if (isNaN(id)) {
    throw new InvalidTaskMarkdownError('O campo "id" deve ser numérico');
  }

  const position = Number(frontmatter.position);
  if (isNaN(position)) {
    throw new InvalidTaskMarkdownError('O campo "position" deve ser numérico');
  }

  // Parsing do corpo Markdown
  const lines = rawBody.split('\n');
  
  // As seções começam por ##
  // Encontra Description, Todo, Comments e seções customizadas
  let currentSection: string | null = null;
  let descriptionLines: string[] = [];
  let todoLines: string[] = [];
  let commentsLines: string[] = [];
  const customSectionsMap = new Map<string, string[]>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(/^##\s+(.+)$/);

    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!['Description', 'Todo', 'Comments'].includes(currentSection) && !customSectionsMap.has(currentSection)) {
        customSectionsMap.set(currentSection, []);
      }
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (currentSection === 'Description') {
      descriptionLines.push(line);
    } else if (currentSection === 'Todo') {
      todoLines.push(line);
    } else if (currentSection === 'Comments') {
      commentsLines.push(line);
    } else {
      customSectionsMap.get(currentSection)?.push(line);
    }
  }

  // Validação das seções obrigatórias (§33)
  const hasDescription = rawBody.match(/^##\s+Description/m);
  const hasTodo = rawBody.match(/^##\s+Todo/m);
  const hasComments = rawBody.match(/^##\s+Comments/m);

  if (!hasDescription) {
    throw new InvalidTaskMarkdownError('Seção "## Description" obrigatória não encontrada');
  }
  if (!hasTodo) {
    throw new InvalidTaskMarkdownError('Seção "## Todo" obrigatória não encontrada');
  }
  if (!hasComments) {
    throw new InvalidTaskMarkdownError('Seção "## Comments" obrigatória não encontrada');
  }

  const description = descriptionLines.join('\n').trim();

  // Parsing de Todos (- [ ] ou - [x])
  const todos: TodoItem[] = [];
  for (const line of todoLines) {
    const todoMatch = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      todos.push({
        completed: todoMatch[1].toLowerCase() === 'x',
        text: todoMatch[2].trim()
      });
    }
  }

  // Parsing de Comentários (### YYYY-MM-DD HH:mm)
  const comments: CommentItem[] = [];
  let currentCommentTimestamp: string | null = null;
  let currentCommentLines: string[] = [];

  const flushComment = () => {
    if (currentCommentTimestamp) {
      comments.push({
        timestamp: currentCommentTimestamp,
        text: currentCommentLines.join('\n').trim()
      });
      currentCommentTimestamp = null;
      currentCommentLines = [];
    }
  };

  for (const line of commentsLines) {
    const commentMatch = line.match(/^###\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
    if (commentMatch) {
      flushComment();
      currentCommentTimestamp = commentMatch[1];
    } else if (currentCommentTimestamp) {
      currentCommentLines.push(line);
    }
  }
  flushComment();

  // Seções customizadas
  const customSections: CustomSection[] = [];
  for (const [heading, secLines] of customSectionsMap.entries()) {
    customSections.push({
      heading: `## ${heading}`,
      content: secLines.join('\n').trim()
    });
  }

  return {
    id,
    title: String(frontmatter.title),
    status: String(frontmatter.status),
    position,
    created_at: String(frontmatter.created_at),
    updated_at: String(frontmatter.updated_at),
    description,
    todos,
    comments,
    customSections,
    hash
  };
}

/**
 * Serializa uma entidade Task de volta para string Markdown completa.
 */
export function serializeTaskMarkdown(task: Task): string {
  const frontmatterObj = {
    id: task.id,
    title: task.title,
    status: task.status,
    position: task.position,
    created_at: task.created_at,
    updated_at: task.updated_at
  };

  const yamlStr = YAML.stringify(frontmatterObj).trim();

  let body = `# ${task.title}\n\n`;

  // Seção Description
  body += `## Description\n\n`;
  if (task.description && task.description.trim()) {
    body += `${task.description.trim()}\n\n`;
  }

  // Seção Todo
  body += `## Todo\n\n`;
  if (task.todos && task.todos.length > 0) {
    for (const todo of task.todos) {
      const check = todo.completed ? 'x' : ' ';
      body += `- [${check}] ${todo.text}\n`;
    }
    body += '\n';
  }

  // Seção Comments
  body += `## Comments\n\n`;
  if (task.comments && task.comments.length > 0) {
    for (const comment of task.comments) {
      body += `### ${comment.timestamp}\n\n`;
      if (comment.text && comment.text.trim()) {
        body += `${comment.text.trim()}\n\n`;
      }
    }
  }

  // Seções customizadas adicionais
  if (task.customSections && task.customSections.length > 0) {
    for (const sec of task.customSections) {
      body += `${sec.heading}\n\n`;
      if (sec.content && sec.content.trim()) {
        body += `${sec.content.trim()}\n\n`;
      }
    }
  }

  return `---\n${yamlStr}\n---\n\n${body}`.trim() + '\n';
}
