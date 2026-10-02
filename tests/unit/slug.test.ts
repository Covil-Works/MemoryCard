import { describe, it, expect } from 'vitest';
import { generateProjectSlug } from '../../src/core/utils/slug.js';

describe('generateProjectSlug', () => {
  it('converte para minúsculo, sem acentos, sem underscores e sem caracteres especiais', () => {
    expect(generateProjectSlug('Projeto X')).toBe('projeto-x');
    expect(generateProjectSlug('Ação & Reação_123!')).toBe('acao-reacao-123');
    expect(generateProjectSlug('ratatui')).toBe('ratatui');
    expect(generateProjectSlug('  Meu   App   ')).toBe('meu-app');
  });

  it('retorna fallback "project" para strings vazias ou inválidas', () => {
    expect(generateProjectSlug('')).toBe('project');
    expect(generateProjectSlug('!!!')).toBe('project');
  });
});
