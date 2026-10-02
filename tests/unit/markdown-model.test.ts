import { describe, it, expect } from 'vitest';
import { DEFAULT_MODEL_TEMPLATE } from '../../src/core/domain/model.js';
import {
  validateModelTemplate,
  renderModelTemplate,
  InvalidModelTemplateError
} from '../../src/core/parser/markdown-model.js';

describe('Markdown Model Parser & Validator', () => {
  it('valida o template padrão default.md como válido', () => {
    const result = validateModelTemplate(DEFAULT_MODEL_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejeita template que remove campo obrigatório do frontmatter', () => {
    const invalidTemplate = DEFAULT_MODEL_TEMPLATE.replace('status: {{status}}\n', '');
    const result = validateModelTemplate(invalidTemplate);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('status'))).toBe(true);
  });

  it('rejeita template que remove seção obrigatória como Todo', () => {
    const invalidTemplate = DEFAULT_MODEL_TEMPLATE.replace('## Todo\n\n{{todo}}\n\n', '');
    const result = validateModelTemplate(invalidTemplate);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('## Todo'))).toBe(true);
  });

  it('renderiza uma nova task a partir do template com os placeholders preenchidos', () => {
    const rendered = renderModelTemplate(DEFAULT_MODEL_TEMPLATE, {
      id: 42,
      title: 'Minha Nova Tarefa',
      status: 'todo',
      position: 1,
      created_at: '2026-10-02T16:00:00-03:00',
      updated_at: '2026-10-02T16:00:00-03:00',
      description: 'Descrição de teste',
      todo: '- [ ] Passo 1',
      comments: ''
    });

    expect(rendered).toContain('id: 42');
    expect(rendered).toContain('title: Minha Nova Tarefa');
    expect(rendered).toContain('# Minha Nova Tarefa');
    expect(rendered).toContain('Descrição de teste');
    expect(rendered).toContain('- [ ] Passo 1');
  });
});
