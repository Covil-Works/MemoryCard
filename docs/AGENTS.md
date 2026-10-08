# Diretrizes para Documentação do MemoryCard (`docs/AGENTS.md`)

Este documento instrui agentes de IA e desenvolvedores sobre como estruturar, manter e evoluir a documentação transversal do **MemoryCard** dentro do diretório `docs/`.

---

## 1. Propósito da Pasta `docs/`
A pasta `docs/` armazena a documentação transversal do projeto, abrangendo:
- **Regras:** Princípios imutáveis ou restrições de negócio e segurança.
- **Decisões:** Decisões arquiteturais, de design e escolhas técnicas.
- **Convenções:** Padrões estruturais de interface (UI), código e fluxos de dados que devem ser seguidos de maneira consistente.

---

## 2. Mapa Geral e Descoberta (`docs/index.md`)
- Todo novo documento adicionado à pasta `docs/` deve ser imediatamente registrado no índice mestre [docs/index.md](index.md).
- Agentes de IA que ingressam na pasta `docs/` devem utilizar o `docs/index.md` como mapa inicial de navegação e busca de contexto.

---

## 3. Identificação Sequencial de Convenções de UI
Para garantir rastreabilidade em commits, PRs, tarefas e revisões de código, **todas as convenções criadas e catalogadas para interface do usuário (UI) devem receber um identificador sequencial único**:
- Formato: `UI-XXX` (iniciando em `UI-001`, `UI-002`, `UI-003`, etc.).
- O arquivo principal de catálogo de convenções de UI é [docs/ui/conventions.md](ui/conventions.md).
- Cada convenção deve conter:
  1. **ID e Título:** `UI-XXX: [Nome da Convenção]`
  2. **Contexto e Motivação:** Problema de UX/UI resolvido pelo padrão.
  3. **Estrutura e Anatomia:** Detalhamento da hierarquia visual e funcional.
- **Rigor Documental:** Não crie ou deduza novas convenções sem validação e alinhamento prévio; registre apenas decisões expressamente acordadas ou migradas de fontes oficiais do projeto.

---

## 4. Identificação e Estrutura de Decisões de Arquitetura (ADRs)
Para assegurar rastreabilidade técnica e governança das escolhas estruturais do projeto, **todas as decisões de arquitetura devem ser catalogadas na pasta `docs/architecture/`, separadas por contexto e identificadas de forma única**:
- **Organização por Contexto:** Arquivos nomeados no padrão `ADR-<CONTEXTO>.md` (ex.: [docs/architecture/ADR-UI.md](architecture/ADR-UI.md)).
- **Identificador Único por Decisão:** Cada decisão arquitetural dentro de um arquivo de contexto deve receber um identificador sequencial próprio: `ADR-<CONTEXTO>-XXX` (ex.: `ADR-UI-001`, `ADR-UI-002`, etc.).
- **Estrutura Obrigatória de cada Decisão:**
  1. **ID e Título:** `ADR-<CONTEXTO>-XXX: [Nome da Decisão]`
  2. **Contexto e Motivação:** Problema arquitetural, restrições operacionais ou limitações de ambiente.
  3. **Decisão Arquitetural e Regras:** Regras mandatórias, restrições técnicas e diretrizes de implementação adotadas.
- **Rigor Documental:** Não crie ou deduza novas regras arquiteturais sem validação e alinhamento prévio; registre apenas decisões expressamente acordadas ou migradas de fontes oficiais do projeto.

---

## 5. Organização de Subdiretórios
Mantenha a organização temática modular:
- `docs/ui/`: Convenções visuais, design tokens e diretrizes de interface (`UI-XXX`).
- `docs/architecture/`: Decisões de arquitetura de software agrupadas por contexto (`ADR-<CONTEXTO>.md` e `ADR-<CONTEXTO>-XXX`).
- Demais temas transversais devem ser criados sob subpastas específicas e referenciados no índice.

