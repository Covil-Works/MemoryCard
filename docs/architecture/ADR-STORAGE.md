# Decisões de Arquitetura — Armazenamento e Persistência (`docs/architecture/ADR-STORAGE.md`)

Este documento registra as decisões arquiteturais (ADRs) relacionadas ao armazenamento, concorrência e gerenciamento de arquivos do **MemoryCard**.

---

## Índice de Decisões

| ID | Título |
|---|---|
| [ADR-STORAGE-001](#adr-storage-001-integridade-de-armazenamento-e-concorrência-atômica) | Integridade de Armazenamento e Concorrência Atômica |
| [ADR-STORAGE-002](#adr-storage-002-separação-de-escopos-local-vs-global) | Separação de Escopos Local vs Global |
| [ADR-STORAGE-003](#adr-storage-003-preservação-de-ambiente-e-recursos-temporários) | Preservação de Ambiente e Recursos Temporários |

---

## ADR-STORAGE-001: Integridade de Armazenamento e Concorrência Atômica

### 1. Contexto e Motivação
Modificações concorrentes ou interrupções abruptas de processo durante a escrita de arquivos de configuração e tasks podem causar corrupção de dados ou condições de corrida.

### 2. Decisão Arquitetural e Regras
- **Escrita Atômica:** Modificações em arquivos de configuração e tasks devem utilizar escrita atômica via `atomicWriteFile`.
- **Controle de Concorrência Otimista (OCC):** Atualizações devem validar concorrência com base em hash SHA-256 (`If-Match`).

---

## ADR-STORAGE-002: Separação de Escopos Local vs Global

### 1. Contexto e Motivação
Projetos individuais exigem isolamento estrito de seus arquivos e tasks, enquanto o catálogo geral de workspaces e templates globais requer compartilhamento entre projetos.

### 2. Decisão Arquitetural e Regras
- **Escopo Local de Projeto:** Projetos individuais mantêm suas configurações e tasks exclusivamente em `.memorycard/` no diretório raiz do projeto.
- **Escopo Global:** O diretório global (`MEMORYCARD_GLOBAL_DIR` ou `~/.memorycard/`) gerencia apenas o índice de projetos (`projects.json`) e modelos globais.

---

## ADR-STORAGE-003: Preservação de Ambiente e Recursos Temporários

### 1. Contexto e Motivação
A execução de scripts, comandos CLI e testes automatizados não pode causar efeitos colaterais permanentes indesejados ou poluir o ambiente de desenvolvimento do usuário.

### 2. Decisão Arquitetural e Regras
- Qualquer script, CLI ou teste executado em ambiente de desenvolvimento deve preservar a integridade do sistema operacional e limpar recursos temporários gerados durante o processo.
