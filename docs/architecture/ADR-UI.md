# Decisões de Arquitetura — UI e Frontend Web (`docs/architecture/ADR-UI.md`)

Este documento registra as decisões arquiteturais (ADRs) relacionadas à interface web e ao ecossistema frontend do **MemoryCard**.

---

## Índice de Decisões

| ID | Título |
|---|---|
| [ADR-UI-001](#adr-ui-001-independência-de-diretório-de-execução-processcwd) | Independência de Diretório de Execução (`process.cwd()`) |
| [ADR-UI-002](#adr-ui-002-resiliência-de-eventos-sse-server-sent-events) | Resiliência de Eventos SSE (Server-Sent Events) |
| [ADR-UI-003](#adr-ui-003-servidor-acessível-em-rede-local-0000-e-conexão-de-dispositivos-móveis) | Servidor Acessível em Rede Local (`0.0.0.0`) e Conexão de Dispositivos Móveis |

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

---

## ADR-UI-003: Servidor Acessível em Rede Local (`0.0.0.0`) e Conexão de Dispositivos Móveis

### 1. Contexto e Motivação
Desenvolvedores e usuários frequentemente precisam visualizar, acompanhar e manipular tarefas no quadro Kanban utilizando seus smartphones conectados à mesma rede local (Wi-Fi). Para que isso ocorra de forma transparente sem exigir configurações manuais de rede:
- O servidor não deve se limitar a escutar apenas na interface de loopback (`127.0.0.1`/`localhost`).
- O sistema deve descobrir dinamicamente o endereço IPv4 ativo da máquina na rede local e disponibilizá-lo tanto no terminal quanto na interface gráfica, acompanhado de QR Code escaneável.

### 2. Decisão Arquitetural e Regras
- **Binding Padrão em `0.0.0.0`:** O servidor HTTP local escuta por padrão em `0.0.0.0` (todas as interfaces de rede IPv4), permitindo conexões locais e externas pela LAN.
- **Parametrização via CLI:** Suporte explícito a `-H, --host <host>` (padrão `0.0.0.0`) e `-p, --port <port>` (padrão `3333`) nos comandos raiz, `memorycard open` e `memorycard ui`.
- **Exibição Transparente de Rotas:** O servidor identifica dinamicamente o IP da rede local via `os.networkInterfaces()` e imprime no terminal tanto a rota `Local:` quanto a rota `Rede:` ao iniciar.
- **Endpoint `/api/system/network`:** Provê à aplicação React o endereço de rede atual e o QR Code em Base64 Data URL, permitindo que a interface gráfica abra um modal interativo com link copiável e QR code escaneável para celulares.

