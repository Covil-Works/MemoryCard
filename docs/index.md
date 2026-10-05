# Índice Geral de Documentação (`docs/index.md`)

Este arquivo é o mapa central de documentações transversais do **MemoryCard**. Ele serve como ponto de partida para agentes de IA e desenvolvedores descobrirem regras, decisões e convenções aplicáveis ao projeto.

> [!TIP]
> **For documentation discovery, start with `docs/index.md`. Do not scan the entire docs directory unless necessary.**

---

## 1. Diretrizes para Agentes de IA
- [AGENTS.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/AGENTS.md): Roteador de contexto principal para agentes de IA na raiz do repositório.
- [docs/AGENTS.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/docs/AGENTS.md): Como produzir, estruturar e manter a documentação na pasta `docs/`.
- [tests/AGENTS.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/tests/AGENTS.md): Regras de isolamento, integridade dos testes e variáveis globais.

---

## 2. Interface do Usuário (UI & UX)
- [docs/ui/conventions.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/docs/ui/conventions.md): Convenções visuais e estruturais de interface:
  - **`UI-001`**: *Padrão Estrutural de Configurações por Temas e Opções Contextuais*.
  - **`UI-002`**: *Criação de Novos Componentes e Utilitários*.
  - **`UI-003`**: *Responsividade Mobile e Quadro Kanban com Rolagem Horizontal Isolada*.

---

## 3. Decisões de Arquitetura (ADRs)
- [docs/architecture/ADR-STORAGE.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/docs/architecture/ADR-STORAGE.md): Decisões arquiteturais de Armazenamento, Concorrência e Ambiente:
  - **`ADR-STORAGE-001`**: *Integridade de Armazenamento e Concorrência Atômica*.
  - **`ADR-STORAGE-002`**: *Separação de Escopos Local vs Global*.
  - **`ADR-STORAGE-003`**: *Preservação de Ambiente e Recursos Temporários*.
- [docs/architecture/ADR-UI.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/docs/architecture/ADR-UI.md): Decisões arquiteturais de UI e Frontend Web:
  - **`ADR-UI-001`**: *Independência de Diretório de Execução (`process.cwd()`)*.
  - **`ADR-UI-002`**: *Resiliência de Eventos SSE (Server-Sent Events)*.


