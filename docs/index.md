# Índice Geral de Documentação (`docs/index.md`)

Este arquivo é o mapa central de documentações transversais do **MemoryCard**. Ele serve como ponto de partida para agentes de IA e desenvolvedores descobrirem regras, decisões e convenções aplicáveis ao projeto.

> [!TIP]
> **For documentation discovery, start with `docs/index.md`. Do not scan the entire docs directory unless necessary.**

---

## 1. Diretrizes para Agentes de IA
- [AGENTS.md](../AGENTS.md): Roteador de contexto principal para agentes de IA na raiz do repositório.
- [docs/AGENTS.md](AGENTS.md): Como produzir, estruturar e manter a documentação na pasta `docs/`.
- [tests/AGENTS.md](../tests/AGENTS.md): Regras de criação sob demanda, integridade dos testes, isolamento e variáveis globais.
- [skills/memorycard/SKILL.md](../skills/memorycard/SKILL.md): Skill para gerenciamento de tasks e comandos CLI do MemoryCard.

---

## 2. Interface do Usuário (UI & UX)
- [docs/ui/conventions.md](ui/conventions.md): Convenções visuais e estruturais de interface:
  - **`UI-001`**: *Padrão Estrutural de Configurações por Temas e Opções Contextuais*.
  - **`UI-002`**: *Criação de Novos Componentes e Utilitários*.
  - **`UI-003`**: *Responsividade Mobile e Quadro Kanban com Rolagem Horizontal Isolada*.
  - **`UI-004`**: *Proibição de Emojis na Interface do Usuário (No-Emoji Policy)*.
  - **`UI-005`**: *Suporte a Temas Visuais (Default e Play)*.

---

## 3. Decisões de Arquitetura (ADRs)
- [docs/architecture/ADR-STORAGE.md](architecture/ADR-STORAGE.md): Decisões arquiteturais de Armazenamento, Concorrência e Ambiente:
  - **`ADR-STORAGE-001`**: *Integridade de Armazenamento e Concorrência Atômica*.
  - **`ADR-STORAGE-002`**: *Separação de Escopos Local vs Global*.
  - **`ADR-STORAGE-003`**: *Preservação de Ambiente e Recursos Temporários*.
- [docs/architecture/ADR-UI.md](architecture/ADR-UI.md): Decisões arquiteturais de UI e Frontend Web:
  - **`ADR-UI-001`**: *Independência de Diretório de Execução (`process.cwd()`)*.
  - **`ADR-UI-002`**: *Resiliência de Eventos SSE (Server-Sent Events)*.
  - **`ADR-UI-003`**: *Servidor Acessível em Rede Local (`0.0.0.0`) e Conexão de Dispositivos Móveis*.

