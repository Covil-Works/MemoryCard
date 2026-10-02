/**
 * Gera um slug determinístico a partir do nome do projeto:
 * - minúsculo
 * - sem espaços (substituídos por hífen ou removidos)
 * - sem _
 * - sem acentos
 * - sem caracteres especiais
 * Exemplo: "Projeto X 2.0" -> "projeto-x-2-0"
 */
export function generateProjectSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'project';
  }

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/_/g, '-') // sem _
    .replace(/[^a-z0-9-]+/g, '-') // substitui espaços e caracteres especiais por -
    .replace(/-+/g, '-') // unifica hífens repetidos
    .replace(/^-+|-+$/g, ''); // apara hífens das extremidades

  return slug || 'project';
}
