import { describe, it, expect } from 'vitest';
import {
  parseTaskMarkdown,
  serializeTaskMarkdown,
  InvalidTaskMarkdownError
} from '../../src/core/parser/markdown-task.js';

describe('Markdown Task Parser & Serializer', () => {
  const validTaskMd = `---
id: 4858
title: Implementar autenticação
status: in-progress
position: 2
created_at: 2026-10-01T14:30:00-03:00
updated_at: 2026-10-02T12:15:00-03:00
---

# Implementar autenticação

## Description

Implementar autenticação do usuário e persistência da sessão.

## Todo

- [x] Criar estrutura inicial
- [ ] Implementar login

## Comments

### 2026-10-02 11:30

Login implementado e validado.

### 2026-10-02 12:05

A persistência ainda precisa tratar sessão expirada.
`;

  it('faz parse com sucesso de uma task válida conforme spec', () => {
    const task = parseTaskMarkdown(validTaskMd);

    expect(task.id).toBe(4858);
    expect(task.title).toBe('Implementar autenticação');
    expect(task.status).toBe('in-progress');
    expect(task.position).toBe(2);
    expect(task.created_at).toBe('2026-10-01T14:30:00-03:00');
    expect(task.updated_at).toBe('2026-10-02T12:15:00-03:00');
    expect(task.description).toBe('Implementar autenticação do usuário e persistência da sessão.');
    expect(task.todos).toHaveLength(2);
    expect(task.todos[0]).toEqual({ completed: true, text: 'Criar estrutura inicial' });
    expect(task.todos[1]).toEqual({ completed: false, text: 'Implementar login' });
    expect(task.comments).toHaveLength(2);
    expect(task.comments[0].timestamp).toBe('2026-10-02 11:30');
    expect(task.comments[0].text).toBe('Login implementado e validado.');
  });

  it('preserva seções customizadas do Markdown', () => {
    const customMd = `${validTaskMd}\n## Architecture Decisions\n\nUsar JWT stateless.\n`;
    const task = parseTaskMarkdown(customMd);

    expect(task.customSections).toHaveLength(1);
    expect(task.customSections[0].heading).toBe('## Architecture Decisions');
    expect(task.customSections[0].content).toBe('Usar JWT stateless.');
  });

  it('rejeita task sem frontmatter ou sem campos obrigatórios', () => {
    expect(() => parseTaskMarkdown('# Sem frontmatter')).toThrow(InvalidTaskMarkdownError);

    const missingField = `---
id: 1
title: Test
status: todo
---
## Description
X
## Todo
## Comments
`;
    expect(() => parseTaskMarkdown(missingField)).toThrow(InvalidTaskMarkdownError);
  });

  it('rejeita task sem as seções obrigatórias (Description, Todo, Comments)', () => {
    const missingTodo = `---
id: 1
title: Test
status: todo
position: 0
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
---
# Test
## Description
Ok
## Comments
`;
    expect(() => parseTaskMarkdown(missingTodo)).toThrow(InvalidTaskMarkdownError);
  });

  it('serializa a task de forma idempotente e compatível', () => {
    const parsed = parseTaskMarkdown(validTaskMd);
    const serialized = serializeTaskMarkdown(parsed);
    const reParsed = parseTaskMarkdown(serialized);

    expect(reParsed.id).toBe(parsed.id);
    expect(reParsed.title).toBe(parsed.title);
    expect(reParsed.status).toBe(parsed.status);
    expect(reParsed.todos).toEqual(parsed.todos);
    expect(reParsed.comments).toEqual(parsed.comments);
    expect(reParsed.description).toBe(parsed.description);
  });
});
