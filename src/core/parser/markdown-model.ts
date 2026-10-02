import { REQUIRED_MODEL_PLACEHOLDERS, REQUIRED_MODEL_SECTIONS } from '../domain/model.js';

export class InvalidModelTemplateError extends Error {
  constructor(public readonly validationErrors: string[]) {
    super(`Modelo de task inválido: ${validationErrors.join(', ')}`);
    this.name = 'InvalidModelTemplateError';
  }
}

/**
 * Valida se um template de modelo possui todos os campos e seções obrigatórias.
 */
export function validateModelTemplate(templateContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!templateContent || typeof templateContent !== 'string') {
    return { valid: false, errors: ['Conteúdo do modelo está vazio'] };
  }

  const normalized = templateContent.replace(/\r\n/g, '\n');

  // Valida frontmatter delimitado
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    errors.push('Frontmatter delimitado por "---" não encontrado');
    return { valid: false, errors };
  }

  const rawFrontmatter = frontmatterMatch[1];
  const rawBody = frontmatterMatch[2];

  // Valida campos obrigatórios no frontmatter (incluindo seus placeholders)
  const requiredFrontmatterKeys = [
    'id',
    'title',
    'status',
    'position',
    'created_at',
    'updated_at'
  ];

  for (const key of requiredFrontmatterKeys) {
    const keyRegex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const match = rawFrontmatter.match(keyRegex);
    if (!match) {
      errors.push(`Campo obrigatório ausente no frontmatter do modelo: "${key}"`);
    } else {
      const val = match[1].trim();
      // Placeholder deve existir no template
      if (!val.includes(`{{${key}}}`)) {
        errors.push(`Placeholder "{{${key}}}" não encontrado no campo "${key}" do frontmatter`);
      }
    }
  }

  // Valida seções obrigatórias no corpo
  for (const section of REQUIRED_MODEL_SECTIONS) {
    const sectionRegex = new RegExp(`^##\\s+${section}\\b`, 'm');
    if (!rawBody.match(sectionRegex)) {
      errors.push(`Seção obrigatória ausente no modelo: "## ${section}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export interface RenderModelParams {
  id: number;
  title: string;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
  description?: string;
  todo?: string;
  comments?: string;
}

/**
 * Preenche os placeholders do modelo com os valores fornecidos.
 */
export function renderModelTemplate(template: string, params: RenderModelParams): string {
  const validation = validateModelTemplate(template);
  if (!validation.valid) {
    throw new InvalidModelTemplateError(validation.errors);
  }

  let result = template;
  result = result.replace(/\{\{id\}\}/g, String(params.id));
  result = result.replace(/\{\{title\}\}/g, params.title);
  result = result.replace(/\{\{status\}\}/g, params.status);
  result = result.replace(/\{\{position\}\}/g, String(params.position));
  result = result.replace(/\{\{created_at\}\}/g, params.created_at);
  result = result.replace(/\{\{updated_at\}\}/g, params.updated_at);
  result = result.replace(/\{\{description\}\}/g, (params.description || '').trim());
  result = result.replace(/\{\{todo\}\}/g, (params.todo || '').trim());
  result = result.replace(/\{\{comments\}\}/g, (params.comments || '').trim());

  return result.trim() + '\n';
}
