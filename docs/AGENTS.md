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
- Todo novo documento adicionado à pasta `docs/` deve ser imediatamente registrado no índice mestre [docs/index.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/docs/index.md).
- Agentes de IA que ingressam na pasta `docs/` devem utilizar o `docs/index.md` como mapa inicial de navegação e busca de contexto.

---

## 3. Identificação Sequencial de Convenções de UI
Para garantir rastreabilidade em commits, PRs, tarefas e revisões de código, **todas as convenções criadas e catalogadas para interface do usuário (UI) devem receber um identificador sequencial único**:
- Formato: `UI-XXX` (iniciando em `UI-001`, `UI-002`, `UI-003`, etc.).
- O arquivo principal de catálogo de convenções de UI é [docs/ui/conventions.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/docs/ui/conventions.md).
- Cada convenção deve conter:
  1. **ID e Título:** `UI-XXX: [Nome da Convenção]`
  2. **Contexto e Motivação:** Problema de UX/UI resolvido pelo padrão.
  3. **Estrutura e Anatomia:** Detalhamento da hierarquia visual e funcional.
  4. **Exemplo Prático:** Código ou telas de referência na aplicação.

---

## 4. Organização de Subdiretórios
Mantenha a organização temática modular:
- `docs/ui/`: Convenções, design tokens e diretrizes de interface.
- `docs/architecture/`: Diagramas conceituais e decisões de arquitetura de software (ADRs).
- Demais temas transversais devem ser criados sob subpastas específicas e referenciados no índice.
