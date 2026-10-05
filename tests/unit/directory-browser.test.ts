import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getSystemShortcuts,
  buildBreadcrumbs,
  browseDirectory,
  createDirectory
} from '../../src/server/directory-browser.js';

describe('Directory Browser Service (§System / FS Browser)', () => {
  let tempBaseDir: string;

  beforeEach(async () => {
    tempBaseDir = path.join(
      os.tmpdir(),
      `memorycard-test-dirbrowser-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.promises.mkdir(tempBaseDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempBaseDir, { recursive: true, force: true });
    } catch {}
  });

  describe('getSystemShortcuts()', () => {
    it('retorna atalhos com Home no primeiro item e CWD no último', () => {
      const shortcuts = getSystemShortcuts();
      expect(Array.isArray(shortcuts)).toBe(true);
      expect(shortcuts.length).toBeGreaterThanOrEqual(2);

      // 1º item deve ser Home (~)
      expect(shortcuts[0].name).toBe('Home (~)');
      expect(shortcuts[0].path).toBe(os.homedir());
      expect(shortcuts[0].type).toBe('home');

      // Último item deve ser Pasta Atual (CWD)
      const last = shortcuts[shortcuts.length - 1];
      expect(last.name).toBe('Pasta Atual (CWD)');
      expect(last.path).toBe(process.cwd());
      expect(last.type).toBe('cwd');

      // Itens intermediários devem ser drives (Windows) ou raiz (Unix)
      if (os.platform() === 'win32') {
        const driveShortcuts = shortcuts.slice(1, -1);
        expect(driveShortcuts.length).toBeGreaterThanOrEqual(1);
        for (const drive of driveShortcuts) {
          expect(drive.type).toBe('drive');
          expect(drive.name).toMatch(/^[A-Z]:$/);
        }
      } else {
        const middle = shortcuts[1];
        expect(middle.type).toBe('root');
        expect(middle.name).toBe('Raiz (/)');
        expect(middle.path).toBe('/');
      }
    });
  });

  describe('buildBreadcrumbs()', () => {
    it('constrói lista sequencial de segmentos do caminho até a raiz', () => {
      const testPath = path.join(tempBaseDir, 'nivel1', 'nivel2');
      const breadcrumbs = buildBreadcrumbs(testPath);

      expect(Array.isArray(breadcrumbs)).toBe(true);
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(3);

      const last = breadcrumbs[breadcrumbs.length - 1];
      expect(last.name).toBe('nivel2');
      expect(last.path).toBe(path.resolve(testPath));

      const penultimate = breadcrumbs[breadcrumbs.length - 2];
      expect(penultimate.name).toBe('nivel1');
      expect(penultimate.path).toBe(path.resolve(path.join(tempBaseDir, 'nivel1')));
    });
  });

  describe('browseDirectory()', () => {
    it('inicia por padrão na Home do usuário quando nenhum caminho é fornecido', async () => {
      const result = await browseDirectory();

      expect(result.currentPath).toBe(path.resolve(os.homedir()));
      expect(result.shortcuts[0].name).toBe('Home (~)');
      expect(Array.isArray(result.directories)).toBe(true);
      expect(Array.isArray(result.breadcrumbs)).toBe(true);
      expect(result.breadcrumbs[result.breadcrumbs.length - 1].path).toBe(path.resolve(os.homedir()));
    });

    it('lista subdiretórios ignorando pastas de ruído (.git, node_modules)', async () => {
      const pastaValida1 = path.join(tempBaseDir, 'app-web');
      const pastaValida2 = path.join(tempBaseDir, 'backend-api');
      const pastaGit = path.join(tempBaseDir, '.git');
      const pastaNodeModules = path.join(tempBaseDir, 'node_modules');

      await fs.promises.mkdir(pastaValida1, { recursive: true });
      await fs.promises.mkdir(pastaValida2, { recursive: true });
      await fs.promises.mkdir(pastaGit, { recursive: true });
      await fs.promises.mkdir(pastaNodeModules, { recursive: true });

      // Cria um arquivo comum (não deve ser listado como diretório)
      await fs.promises.writeFile(path.join(tempBaseDir, 'README.md'), '# Teste');

      const result = await browseDirectory(tempBaseDir);

      const names = result.directories.map(d => d.name);
      expect(names).toContain('app-web');
      expect(names).toContain('backend-api');
      expect(names).not.toContain('.git');
      expect(names).not.toContain('node_modules');
      expect(names).not.toContain('README.md');
    });

    it('identifica corretamente diretórios que já contêm projeto MemoryCard', async () => {
      const pastaComProjeto = path.join(tempBaseDir, 'projeto-existente');
      const pastaComum = path.join(tempBaseDir, 'pasta-normal');

      await fs.promises.mkdir(path.join(pastaComProjeto, '.memorycard'), { recursive: true });
      await fs.promises.writeFile(
        path.join(pastaComProjeto, '.memorycard', 'config.json'),
        JSON.stringify({ project: { id: 'test', name: 'Existente' } })
      );

      await fs.promises.mkdir(pastaComum, { recursive: true });

      const result = await browseDirectory(tempBaseDir);

      const projItem = result.directories.find(d => d.name === 'projeto-existente');
      const normalItem = result.directories.find(d => d.name === 'pasta-normal');

      expect(projItem?.isMemoryCard).toBe(true);
      expect(normalItem?.isMemoryCard).toBe(false);
    });

    it('trata graciosamente caminhos inexistentes sem lançar exceções não tratadas', async () => {
      const caminhoInexistente = path.join(tempBaseDir, 'inexistente', 'profundo');
      const result = await browseDirectory(caminhoInexistente);

      expect(result).toBeDefined();
      expect(typeof result.currentPath).toBe('string');
      expect(Array.isArray(result.directories)).toBe(true);
    });
  });

  describe('createDirectory()', () => {
    it('cria fisicamente um novo subdiretório recursivo no disco', async () => {
      const novaPasta = path.join(tempBaseDir, 'nova-pasta-criada', 'subnivel');
      const res = await createDirectory(novaPasta);

      expect(res.success).toBe(true);
      expect(res.path).toBe(path.resolve(novaPasta));
      expect(fs.existsSync(novaPasta)).toBe(true);
      expect(fs.statSync(novaPasta).isDirectory()).toBe(true);
    });
  });
});
