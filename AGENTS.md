# Orientações para Agentes de IA — Roteador de Contexto (`AGENTS.md`)

Este repositório contém o código do **MemoryCard**, uma plataforma para gerenciamento de memória e estados de tasks em projetos de software.

Este documento funciona como um **roteador de contexto**. Não concentramos regras técnicas, decisões de implementação ou convenções aqui na raiz. Sempre consulte a documentação detalhada nos locais indicados abaixo antes de propor alterações.

---

## 🧭 Roteamento de Contexto

### 1. Documentação Geral e Descoberta
Para qualquer decisão técnica, arquitetura, regras de negócio ou convenções:
- **Ponto de entrada mestre:** [docs/index.md](/memorycard/docs/index.md) (utilize este mapa para descobrir os documentos relevantes sem varrer toda a pasta).
- **Como documentar e manter padrões:** [docs/AGENTS.md](memorycard/docs/AGENTS.md).

### 2. Decisões de Arquitetura de Software (ADRs)
As decisões sobre como o sistema deve ser construído estão catalogadas por contexto na pasta `docs/architecture/`:
- **Armazenamento, concorrência e integridade:** [docs/architecture/ADR-STORAGE.md](memorycard/docs/architecture/ADR-STORAGE.md).
- **Interface Web e Frontend:** [docs/architecture/ADR-UI.md](memorycard/docs/architecture/ADR-UI.md).

### 3. Convenções de Interface do Usuário (UI)
- Para padrões visuais, criação de componentes e modais: [docs/ui/conventions.md](memorycard/docs/ui/conventions.md).

### 4. Suíte de Testes Automatizados
- Para diretrizes obrigatórias de testes: [tests/AGENTS.md](memorycard/tests/AGENTS.md).

### 5. Skills e Operação do MemoryCard
- Para instruções de gerenciamento de tasks e CLI pelo agente: [skills/memorycard/SKILL.md](skills/memorycard/SKILL.md).

