import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyColumnOrder,
  reorderColumnArray,
  moveColumnDirection,
  getStoredColumnOrder,
  saveStoredColumnOrder,
  clearStoredColumnOrder,
} from '../../src/web/utils/column-order';

interface TestColumn {
  id: string;
  name: string;
  order: number;
}

interface TestTask {
  id: number;
  title: string;
  status: string;
}

describe('Kanban Column Reordering System', () => {
  const initialColumns: TestColumn[] = [
    { id: 'todo', name: 'Todo', order: 0 },
    { id: 'in-progress', name: 'In Progress', order: 1 },
    { id: 'done', name: 'Done', order: 2 },
  ];

  const mockTasks: TestTask[] = [
    { id: 1, title: 'Task 1', status: 'todo' },
    { id: 2, title: 'Task 2', status: 'in-progress' },
    { id: 3, title: 'Task 3', status: 'done' },
    { id: 4, title: 'Task 4', status: 'todo' },
  ];

  // Mock básico de localStorage no ambiente Node / Vitest
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, value: string) => { storageMap.set(key, value); },
    removeItem: (key: string) => { storageMap.delete(key); },
    clear: () => { storageMap.clear(); },
  };

  beforeEach(() => {
    storageMap.clear();
    // Injeta global window e localStorage se não existirem
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }
    (global as any).localStorage = mockLocalStorage;
    (global as any).window.localStorage = mockLocalStorage;
  });

  describe('Reordenação de Colunas (reorderColumnArray & moveColumnDirection)', () => {
    it('move coluna para nova posição via drag & drop (reorderColumnArray)', () => {
      // Mover 'done' para a primeira posição
      const reordered = reorderColumnArray(initialColumns, 'done', 'todo');
      expect(reordered.map((c) => c.id)).toEqual(['done', 'todo', 'in-progress']);

      // Mover 'todo' para o final
      const reordered2 = reorderColumnArray(initialColumns, 'todo', 'done');
      expect(reordered2.map((c) => c.id)).toEqual(['in-progress', 'done', 'todo']);
    });

    it('retorna a lista inalterada se a origem e o destino forem iguais', () => {
      const same = reorderColumnArray(initialColumns, 'in-progress', 'in-progress');
      expect(same.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);
    });

    it('retorna a lista inalterada se o ID de origem ou destino não existir', () => {
      const invalid = reorderColumnArray(initialColumns, 'inexistente', 'todo');
      expect(invalid.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);
    });

    it('move coluna para a esquerda e para a direita via botões direcionais (moveColumnDirection)', () => {
      // Mover 'in-progress' para a esquerda
      const movedLeft = moveColumnDirection(initialColumns, 'in-progress', 'left');
      expect(movedLeft.map((c) => c.id)).toEqual(['in-progress', 'todo', 'done']);

      // Mover 'in-progress' para a direita
      const movedRight = moveColumnDirection(initialColumns, 'in-progress', 'right');
      expect(movedRight.map((c) => c.id)).toEqual(['todo', 'done', 'in-progress']);
    });

    it('respeita os limites de borda (primeira coluna não move à esquerda, última não move à direita)', () => {
      const firstCantMoveLeft = moveColumnDirection(initialColumns, 'todo', 'left');
      expect(firstCantMoveLeft.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);

      const lastCantMoveRight = moveColumnDirection(initialColumns, 'done', 'right');
      expect(lastCantMoveRight.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);
    });
  });

  describe('Persistência e Recuperação após Recarregar a Página', () => {
    const slug = 'test-project';

    it('retorna null se o usuário ainda não tiver personalizado a ordem', () => {
      const stored = getStoredColumnOrder(slug);
      expect(stored).toBeNull();
      const applied = applyColumnOrder(initialColumns, stored);
      expect(applied.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);
    });

    it('salva a ordem personalizada no localStorage e recupera com sucesso', () => {
      const customOrder = ['in-progress', 'done', 'todo'];
      saveStoredColumnOrder(slug, customOrder);

      const stored = getStoredColumnOrder(slug);
      expect(stored).toEqual(customOrder);

      // Simulação de recarga da página: aplica a ordem recuperada às colunas originais do projeto
      const reloadedColumns = applyColumnOrder(initialColumns, stored);
      expect(reloadedColumns.map((c) => c.id)).toEqual(['in-progress', 'done', 'todo']);
    });

    it('restaura a ordem original do projeto ao limpar a preferência', () => {
      saveStoredColumnOrder(slug, ['done', 'in-progress', 'todo']);
      expect(getStoredColumnOrder(slug)).not.toBeNull();

      clearStoredColumnOrder(slug);
      expect(getStoredColumnOrder(slug)).toBeNull();

      const resetColumns = applyColumnOrder(initialColumns, getStoredColumnOrder(slug));
      expect(resetColumns.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);
    });
  });

  describe('Resiliência a Dados Inválidos e Evolução de Colunas', () => {
    const slug = 'resilient-project';

    it('trata JSON corrompido ou malformado no localStorage sem quebrar', () => {
      storageMap.set(`memorycard_column_order_${slug}`, '{ malformed json %%%');
      const stored = getStoredColumnOrder(slug);
      expect(stored).toBeNull();

      const result = applyColumnOrder(initialColumns, stored);
      expect(result.map((c) => c.id)).toEqual(['todo', 'in-progress', 'done']);
    });

    it('trata tipos inválidos (números, strings vazias, objetos não-array) no localStorage', () => {
      storageMap.set(`memorycard_column_order_${slug}`, JSON.stringify({ not: 'an array' }));
      expect(getStoredColumnOrder(slug)).toBeNull();

      storageMap.set(`memorycard_column_order_${slug}`, JSON.stringify([123, 456]));
      expect(getStoredColumnOrder(slug)).toBeNull();

      storageMap.set(`memorycard_column_order_${slug}`, JSON.stringify(['']));
      expect(getStoredColumnOrder(slug)).toBeNull();
    });

    it('descarta IDs salvos que foram deletados do projeto', () => {
      // Usuário tinha salvo 'review', mas ela foi removida do config do projeto
      const savedWithDeletedCol = ['review', 'done', 'todo'];
      const result = applyColumnOrder(initialColumns, savedWithDeletedCol);
      expect(result.map((c) => c.id)).toEqual(['done', 'todo', 'in-progress']);
    });

    it('preserva e anexa novas colunas criadas no projeto ao final da visualização', () => {
      // Usuário personalizou 'in-progress' e 'todo', e depois o time criou 'qa' e 'released'
      const updatedProjectColumns: TestColumn[] = [
        ...initialColumns,
        { id: 'qa', name: 'QA', order: 3 },
        { id: 'released', name: 'Released', order: 4 },
      ];

      const savedOrder = ['in-progress', 'todo', 'done'];
      const result = applyColumnOrder(updatedProjectColumns, savedOrder);
      expect(result.map((c) => c.id)).toEqual(['in-progress', 'todo', 'done', 'qa', 'released']);
    });
  });

  describe('Preservação Integral do Status e Dados das Tarefas', () => {
    it('garante que a movimentação de colunas não altera o status de nenhuma tarefa', () => {
      // Ordem customizada: 'done', 'in-progress', 'todo'
      const customOrder = ['done', 'in-progress', 'todo'];
      const orderedColumns = applyColumnOrder(initialColumns, customOrder);

      // Agrupamento de tasks por coluna após reordenação
      const groupedTasks = orderedColumns.map((col) => ({
        columnId: col.id,
        tasks: mockTasks.filter((t) => t.status === col.id),
      }));

      // As tarefas continuam exatamente em suas colunas de origem sem nenhuma mutação
      expect(groupedTasks[0].columnId).toBe('done');
      expect(groupedTasks[0].tasks.map((t) => t.id)).toEqual([3]);

      expect(groupedTasks[1].columnId).toBe('in-progress');
      expect(groupedTasks[1].tasks.map((t) => t.id)).toEqual([2]);

      expect(groupedTasks[2].columnId).toBe('todo');
      expect(groupedTasks[2].tasks.map((t) => t.id)).toEqual([1, 4]);

      // Nenhuma task teve seu status alterado
      expect(mockTasks[0].status).toBe('todo');
      expect(mockTasks[1].status).toBe('in-progress');
      expect(mockTasks[2].status).toBe('done');
      expect(mockTasks[3].status).toBe('todo');
    });
  });

  describe('Compatibilidade com Temas e Isolamento no page.tsx', () => {
    it('valida que globals.css define estilos de drag de colunas para default, play e ps1', () => {
      const globalsCssPath = path.resolve(process.cwd(), 'src/web/app/globals.css');
      const css = fs.readFileSync(globalsCssPath, 'utf-8');

      expect(css).toContain('.kanban-column.column-dragging');
      expect(css).toContain('.kanban-column.column-drag-target');
      expect(css).toContain('[data-theme="play"] .kanban-column.column-drag-target');
      expect(css).toContain('[data-theme="ps1"] .kanban-column.column-drag-target');
      expect(css).toContain('[data-theme="ps1"] .column-drag-handle');
    });

    it('valida que page.tsx isola tipos MIME de tarefas e colunas e previne propagação em cards', () => {
      const pagePath = path.resolve(process.cwd(), 'src/web/app/[slug]/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf-8');

      // Tipos MIME distintos
      expect(pageCode).toContain('application/x-memorycard-column');
      expect(pageCode).toContain('application/x-memorycard-task');

      // Botões do cabeçalho com draggable={false} e stopPropagation
      expect(pageCode).toContain('draggable={false}');
      expect(pageCode).toContain('e.stopPropagation()');

      // Ações no dropdown de coluna
      expect(pageCode).toContain("handleMoveColumn(column.id, 'left')");
      expect(pageCode).toContain("handleMoveColumn(column.id, 'right')");
      expect(pageCode).toContain('handleResetColumnOrder');
    });

    it('valida documentação da convenção UI-006 em docs/ui/conventions.md', () => {
      const conventionsPath = path.resolve(process.cwd(), 'docs/ui/conventions.md');
      const content = fs.readFileSync(conventionsPath, 'utf-8');

      expect(content).toContain('UI-006: Reordenação Personalizada e Persistente de Colunas do Kanban');
      expect(content).toContain('memorycard_column_order_${slug}');
      expect(content).toContain('application/x-memorycard-column');
      expect(content).toContain('application/x-memorycard-task');
    });
  });
});
