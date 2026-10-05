# Orientações para Agentes de IA — Frontend Web (`src/web/AGENTS.md`)

Este documento define regras arquiteturais críticas para o desenvolvimento da interface web do **MemoryCard**.

## 1. Independência de Diretório de Execução (`process.cwd()`)
O CLI do MemoryCard pode ser invocado pelo usuário de qualquer pasta do sistema (ex.: projetos individuais ou diretório `~`). O servidor local instancia o Next.js a partir desse contexto.
- **Proibido usar caminhos relativos ao `process.cwd()` em configurações de build:** Configurações de PostCSS, Tailwind e Webpack devem sempre resolver caminhos estáticos usando `__dirname`.
- **Caminhos normalizados para globs no Tailwind:** No `tailwind.config.js`, use sempre caminhos absolutos normalizados com barras normais (`path.join(__dirname, ...).replace(/\\/g, '/')`), prevenindo que o Windows interprete contrabarras (`\`) como caracteres de escape em globs.
- **Caminho explícito de config no PostCSS:** O plugin `tailwindcss` em `postcss.config.js` deve receber explicitamente `{ config: path.resolve(__dirname, 'tailwind.config.js') }` para nunca tentar localizar a configuração a partir de pastas externas arbitrárias.

## 2. Criação de Novos Componentes e Utilitários
- Ao criar novos diretórios ou páginas com estilização, certifique-se de que o padrão de arquivos esteja coberto pelo `content` em `src/web/tailwind.config.js` (e no espelho da raiz).
- Evite estilos locais que dependam de variáveis ou classes geradas fora do escopo do Next.js.

## 3. Resiliência de Eventos SSE (Server-Sent Events)
- Ao consumir eventos no hook `useSSE`, utilize sempre encadeamento opcional (`event.payload?.propriedade`). Nem todo evento do barramento carrega um `payload` estruturado ou propriedades de escopo de projeto.
