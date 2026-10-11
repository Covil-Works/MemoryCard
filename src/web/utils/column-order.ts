export interface HasId {
  id: string;
}

/**
 * Recupera a ordem das colunas salva no localStorage para um determinado projeto (slug).
 * Retorna null se não houver preferência salva ou se os dados forem inválidos.
 */
export function getStoredColumnOrder(slug: string): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`memorycard_column_order_${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((id) => typeof id === 'string' && id.trim().length > 0)) {
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Salva a ordem das colunas no localStorage para um determinado projeto (slug).
 */
export function saveStoredColumnOrder(slug: string, order: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`memorycard_column_order_${slug}`, JSON.stringify(order));
  } catch {}
}

/**
 * Remove a preferência de ordem salva, restaurando a ordem padrão do projeto.
 */
export function clearStoredColumnOrder(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`memorycard_column_order_${slug}`);
  } catch {}
}

/**
 * Aplica a ordem salva a uma lista de colunas original.
 * - Colunas existentes que estão na lista salva são posicionadas conforme a ordem salva.
 * - Novas colunas adicionadas ao projeto que não constam na ordem salva são anexadas ao final.
 * - IDs salvos que não existem mais no projeto são descartados silenciosamente.
 * - Se a lista salva for nula, vazia ou inválida, retorna a lista original inalterada.
 */
export function applyColumnOrder<T extends HasId>(
  columns: T[],
  savedOrder: string[] | null | undefined
): T[] {
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return [];
  }

  if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
    return [...columns];
  }

  const columnMap = new Map<string, T>();
  for (const col of columns) {
    columnMap.set(col.id, col);
  }

  const result: T[] = [];
  const seenIds = new Set<string>();

  // 1. Aplica a ordem salva para as colunas existentes
  for (const id of savedOrder) {
    const col = columnMap.get(id);
    if (col && !seenIds.has(id)) {
      result.push(col);
      seenIds.add(id);
    }
  }

  // 2. Anexa novas colunas que não estavam na ordem salva
  for (const col of columns) {
    if (!seenIds.has(col.id)) {
      result.push(col);
      seenIds.add(col.id);
    }
  }

  return result.length > 0 ? result : [...columns];
}

/**
 * Move uma coluna de uma posição para outra pelo ID de origem e de destino.
 */
export function reorderColumnArray<T extends HasId>(
  columns: T[],
  sourceId: string,
  targetId: string
): T[] {
  if (sourceId === targetId) return [...columns];

  const sourceIndex = columns.findIndex((c) => c.id === sourceId);
  const targetIndex = columns.findIndex((c) => c.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) return [...columns];

  const next = [...columns];
  const [removed] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, removed);

  return next;
}

/**
 * Move uma coluna um passo para a esquerda ou para a direita.
 */
export function moveColumnDirection<T extends HasId>(
  columns: T[],
  columnId: string,
  direction: 'left' | 'right'
): T[] {
  const currentIndex = columns.findIndex((c) => c.id === columnId);
  if (currentIndex === -1) return [...columns];

  const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= columns.length) return [...columns];

  const next = [...columns];
  const [removed] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, removed);

  return next;
}
