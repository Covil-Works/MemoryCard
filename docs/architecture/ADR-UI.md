# Decisões de Arquitetura — UI e Frontend Web (`docs/architecture/ADR-UI.md`)

Este documento registra as decisões arquiteturais (ADRs) relacionadas à interface web e ao ecossistema frontend do **MemoryCard**.

---

## Índice de Decisões

| ID | Título |
|---|---|
| [ADR-UI-001](#adr-ui-001-independência-de-diretório-de-execução-processcwd) | Independência de Diretório de Execução (`process.cwd()`) |
| [ADR-UI-002](#adr-ui-002-resiliência-de-eventos-sse-server-sent-events) | Resiliência de Eventos SSE (Server-Sent Events) |

---

## ADR-UI-001: Independência de Diretório de Execução (`process.cwd()`)

### 1. Contexto e Motivação
O CLI do MemoryCard pode ser invocado pelo usuário de qualquer pasta do sistema (ex.: projetos individuais ou diretório `~`). O servidor local instancia o Next.js a partir desse contexto.

### 2. Decisão Arquitetural e Regras
- **Proibido usar caminhos relativos ao `process.cwd()` em configurações de build:** Configurações de PostCSS, Tailwind e Webpack devem sempre resolver caminhos estáticos usando `__dirname`.
- **Caminhos normalizados para globs no Tailwind:** No `tailwind.config.js`, use sempre caminhos absolutos normalizados com barras normais (`path.join(__dirname, ...).replace(/\\/g, '/')`), prevenindo que o Windows interprete contrabarras (`\`) como caracteres de escape em globs.
- **Caminho explícito de config no PostCSS:** O plugin `tailwindcss` em `postcss.config.js` deve receber explicitamente `{ config: path.resolve(__dirname, 'tailwind.config.js') }` para nunca tentar localizar a configuração a partir de pastas externas arbitrárias.

---

## ADR-UI-002: Resiliência de Eventos SSE (Server-Sent Events)

### 1. Contexto e Motivação
Comunicação em tempo real entre o backend do MemoryCard e a interface gráfica via Server-Sent Events (SSE). Nem todo evento do barramento carrega um `payload` estruturado ou propriedades de escopo de projeto.

### 2. Decisão Arquitetural e Regras
- Ao consumir eventos no hook `useSSE`, utilize sempre encadeamento opcional (`event.payload?.propriedade`). Nem todo evento do barramento carrega um `payload` estruturado ou propriedades de escopo de projeto.
