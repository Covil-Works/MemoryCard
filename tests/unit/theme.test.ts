import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Visual Theme System (Default, Play, and PS1)', () => {
  it('valida que o tipo Theme e as traduções suportam default, play e ps1', async () => {
    const settingsContextPath = path.resolve(process.cwd(), 'src/web/components/settings-context.tsx');
    const content = fs.readFileSync(settingsContextPath, 'utf-8');

    // Suporte aos 3 temas na declaração de tipo
    expect(content).toContain("export type Theme = 'default' | 'play' | 'ps1'");

    // Traduções em pt-br
    expect(content).toContain("themePs1: 'PS1'");
    expect(content).toContain('themePs1Desc:');

    // Validação de persistência no localStorage
    expect(content).toContain("savedTheme === 'default' || savedTheme === 'play' || savedTheme === 'ps1'");
    expect(content).toContain("parsed.theme === 'default' || parsed.theme === 'play' || parsed.theme === 'ps1'");
    expect(content).toContain("settings.theme === 'default' || settings.theme === 'play' || settings.theme === 'ps1'");
  });

  it('valida que globals.css implementa a identidade visual completa do tema ps1', () => {
    const globalsCssPath = path.resolve(process.cwd(), 'src/web/app/globals.css');
    const css = fs.readFileSync(globalsCssPath, 'utf-8');

    // Seletor raiz do tema PS1 e variáveis essenciais
    expect(css).toContain('[data-theme="ps1"]');
    expect(css).toContain('--ps1-chassis: #dcdce0;');
    expect(css).toContain('--ps1-header: #cfd0d5;');
    expect(css).toContain('--ps1-surface: #ebebef;');
    expect(css).toContain('--ps1-card: #ffffff;');
    expect(css).toContain('--text-primary: #18181b;');

    // Elementos principais estilizados no tema claro
    expect(css).toContain('[data-theme="ps1"] header');
    expect(css).toContain('[data-theme="ps1"] .btn');
    expect(css).toContain('[data-theme="ps1"] .btn-primary');
    expect(css).toContain('[data-theme="ps1"] .btn-action-green');
    expect(css).toContain('[data-theme="ps1"] .btn-action-blue');
    expect(css).toContain('[data-theme="ps1"] .btn-action-pink');
    expect(css).toContain('[data-theme="ps1"] .btn-action-red');
    expect(css).toContain('[data-theme="ps1"] .toggle-active');
    expect(css).toContain('[data-theme="ps1"] .home-projects-box');
    expect(css).toContain('[data-theme="ps1"] .home-project-card');
    expect(css).toContain('[data-theme="ps1"] .kanban-column');
    expect(css).toContain('[data-theme="ps1"] .kanban-task-card');
    expect(css).toContain('[data-theme="ps1"] .modal-surface');
  });

  it('valida que os seletores de tema no cabeçalho e modal de visibilidade incluem ps1', () => {
    const visibilityModalPath = path.resolve(process.cwd(), 'src/web/components/visibility-modal.tsx');
    const appHeaderPath = path.resolve(process.cwd(), 'src/web/components/app-header.tsx');

    const modalContent = fs.readFileSync(visibilityModalPath, 'utf-8');
    const headerContent = fs.readFileSync(appHeaderPath, 'utf-8');

    // Botão de seleção de tema no modal
    expect(modalContent).toContain("onClick={() => setSelectedTheme('ps1')}");
    expect(modalContent).toContain("t('themePs1')");
    expect(modalContent).toContain("t('themePs1Desc')");

    // Botão de seleção de tema no header
    expect(headerContent).toContain("onClick={() => setTheme('ps1')}");
    expect(headerContent).toContain("t('themePs1')");
  });

  it('valida lógica pura de normalização e validação de tema', () => {
    const allowedThemes = ['default', 'play', 'ps1'] as const;
    const normalizeTheme = (theme: string | null | undefined): 'default' | 'play' | 'ps1' => {
      if (theme && (allowedThemes as readonly string[]).includes(theme)) {
        return theme as 'default' | 'play' | 'ps1';
      }
      return 'default';
    };

    expect(normalizeTheme('ps1')).toBe('ps1');
    expect(normalizeTheme('play')).toBe('play');
    expect(normalizeTheme('default')).toBe('default');
    expect(normalizeTheme('neon')).toBe('default');
    expect(normalizeTheme(null)).toBe('default');
    expect(normalizeTheme(undefined)).toBe('default');
  });
});
