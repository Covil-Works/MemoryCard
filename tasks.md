# Tasks de Implementação — MemoryCard (MVP)

Acompanhamento de tarefas e progresso da implementação baseado no [plan.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/plan.md) e [spec.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/spec.md).

---

## Legenda de Status
- [ ] Não iniciado
- [/] Em andamento
- [x] Concluído

---

## Fase 1: Setup do Projeto e Infraestrutura Core

- [x] **1.1 Configuração inicial do repositório**
  - [x] Criar `package.json` com TypeScript, scripts de build/dev/test e dependências essenciais
  - [x] Configurar `tsconfig.json` para Node.js / ESM e Next.js
  - [x] Configurar framework de testes (Vitest)
  - [x] Configurar `.gitignore` (ignorando node_modules, .next, etc., mas mantendo `.memorycard/`)
- [x] **1.2 Módulo de persistência segura e integridade**
  - [x] Implementar `src/storage/atomic-write.ts` com escrita em `.tmp`, sync e rename atômico
  - [x] Implementar `src/storage/hashing.ts` com SHA-256 para OCC
  - [x] Testes unitários para atomic write e hashing
- [x] **1.3 Parser e Serializador de Markdown**
  - [x] Implementar `src/core/parser/markdown-task.ts` (frontmatter YAML, título H1, seções obrigatórias e extras)
  - [x] Suporte a checkboxes em `## Todo` e timestamps em `## Comments`
  - [x] Testes unitários cobrindo parsing, edição e serialização
- [x] **1.4 Gerenciamento de Modelos (Templates)**
  - [x] Implementar `src/core/parser/markdown-model.ts` para validação e injeção de placeholders obrigatórios
  - [x] Definir o template padrão `default.md`
  - [x] Testes unitários de validação e substituição de placeholders
- [x] **1.5 Resolução e Registro de Projetos**
  - [x] Implementar `src/storage/project-registry.ts` para `~/.memorycard/projects.json` e `~/.memorycard/models/default.md`
  - [x] Implementar `src/project-resolution/resolve-project.ts` (walk-up a partir do cwd)
  - [x] Implementar utilitário `src/core/utils/slug.ts` para geração determinística de slug
  - [x] Testes unitários de resolução de projeto e relink

---

## Fase 2: Serviços de Domínio e Regras de Negócio

- [x] **2.1 TaskService**
  - [x] Implementar controle monotônico de `next_task_id` com algoritmo de recuperação de inconsistência
  - [x] Criação de task com modelo padrão ou customizado
  - [x] Leitura (`show`, `list`) com ordenação (`updated_at`, `alphabetical`, `custom`)
  - [x] Edição com checagem de hash OCC (rejeitar conflito se alterado externamente)
  - [x] Exclusão de task (sem reutilizar ID)
  - [x] Movimentação entre colunas (`status`, `position`, `updated_at`)
  - [x] Comandos de consulta `current` (mais recente em `in-progress`) e `resume` (resumo para coding agent)
- [x] **2.2 TodoService**
  - [x] `add(taskId, text)`: adicionar novo checkbox desmarcado
  - [x] `done(taskId, index)`: marcar item 1-indexed
  - [x] `undo(taskId, index)`: desmarcar item 1-indexed
  - [x] `remove(taskId, index)`: excluir item do checklist
- [x] **2.3 CommentService**
  - [x] Adicionar comentário ao final de `## Comments` com `### YYYY-MM-DD HH:mm`
- [x] **2.4 StatusService**
  - [x] Listar, adicionar, renomear e remover status/colunas em `.memorycard/config.json`
- [x] **2.5 ModelService**
  - [x] Resolução de modelo (global vs local do projeto)
  - [x] Validação estrutural de modelos criados pelo usuário
- [x] **2.6 Testes unitários e de integração de serviços**
  - [x] Cobertura completa de cenários de concorrência, colisão de IDs e ciclo de vida de tasks

---

## Fase 3: Interface de Linha de Comando (CLI)

- [x] **3.1 Entrypoint e Estrutura do CLI**
  - [x] Configurar `bin/memorycard.js` e `src/cli/index.ts` usando Commander
  - [x] Suporte global a flags `-h` e `--help`
  - [x] Exit codes semânticos (0 para sucesso, != 0 para erros tratados)
- [x] **3.2 Comandos de Projeto**
  - [x] `memorycard init` (inicializa diretório atual e registra no índice global)
  - [x] `memorycard project` (exibe dados do projeto atual)
  - [x] `memorycard open` (abre o board do projeto no navegador)
- [x] **3.3 Comandos de Consulta**
  - [x] `memorycard list`
  - [x] `memorycard show <id>`
  - [x] `memorycard current`
  - [x] `memorycard resume <id>`
- [x] **3.4 Comandos de Manipulação de Tasks**
  - [x] `memorycard create` (com suporte a argumento, flags e stdin)
  - [x] `memorycard edit <id>` (`--title`, `--description`, `--status`)
  - [x] `memorycard delete <id>` (com confirmação)
  - [x] `memorycard move <id> <status>`
- [x] **3.5 Comandos de Checklist e Comentários**
  - [x] `memorycard todo add <id> "texto"`
  - [x] `memorycard todo done <id> <n>`
  - [x] `memorycard todo undo <id> <n>`
  - [x] `memorycard todo remove <id> <n>`
  - [x] `memorycard comment <id> "texto"`
- [x] **3.6 Comandos de Status**
  - [x] `memorycard status list`
  - [x] `memorycard status add`
  - [x] `memorycard status rename`
  - [x] `memorycard status remove`
- [x] **3.7 Testes de integração do CLI**
  - [x] Testar execução dos comandos via subprocessos e verificar integridade dos arquivos

---

## Fase 4: Servidor Local, File Watcher & SSE

- [x] **4.1 File Watcher**
  - [x] Configurar Chokidar para observar seletivamente `.memorycard/config.json`, `tasks/`, `models/` e `~/.memorycard/models/`
  - [x] Aplicar debounce para evitar disparos duplicados em atomic write
- [x] **4.2 Barramento de Eventos e SSE**
  - [x] Implementar EventEmitter e endpoint `/api/events` (Server-Sent Events)
  - [x] Emissão dos eventos mínimos: `task-created`, `task-updated`, `task-deleted`, `config-updated`, `model-updated`, `project-availability-changed`
- [x] **4.3 Servidor HTTP e API REST**
  - [x] Configurar servidor Node/Next.js que inicia na porta padrão (com fallback)
  - [x] Rotas REST para Projetos, Tasks, Statuses, Modelos e Seletor de Diretório
  - [x] Implementar seletor nativo de diretório no backend (`/api/system/select-directory`)
  - [x] Comando principal `memorycard` (sem args) para subir servidor e abrir navegador
- [x] **4.4 Testes de integração de Watcher e SSE**
  - [x] Testar emissão de evento após alteração direta em arquivo no disco

---

## Fase 5: Interface Visual Minimalista (React / Next.js)

- [x] **5.1 Layout base e Identidade Visual**
  - [x] Design minimalista preto e branco (B&W, alto contraste, sem gradientes)
  - [x] Feedback visual claro para loading, erros e conflitos
- [x] **5.2 Dashboard Geral (`/`)**
  - [x] Listagem de projetos registrados no sistema
  - [x] Indicador de disponibilidade (pasta existente ou inacessível)
  - [x] Ação de relink com validação de `project.id`
  - [x] Ação de "New Project" com acionamento do seletor nativo
- [x] **5.3 Board do Projeto (`/<slug>`)**
  - [x] Cabeçalho com nome do projeto, seletor de ordenação e ações rápidas
  - [x] Renderização de colunas (Todo, In Progress, Done e customizadas)
  - [x] Drag and drop de tasks entre colunas e reordenação interna
  - [x] Cartões de task com `#id`, título, contador de todos e updated_at relativo
- [x] **5.4 Modal / Painel de Tarefa**
  - [x] Visualização e edição explícita de título e descrição
  - [x] Checklist interativo de Todos (toggle imediato)
  - [x] Histórico de comentários e formulário para novo comentário
  - [x] Exclusão de tarefa com confirmação
  - [x] **Controle de Concorrência (OCC) na UI:**
    - Detectar evento SSE durante edição ativa
    - Não sobrescrever formulário aberto
    - Exibir banner de conflito exigindo Reload antes de salvar
    - Bloquear salvamento se hash do disco diferir do hash carregado
- [x] **5.5 Modal / Gerenciamento de Modelos**
  - [x] Visualizar modelos disponíveis (globais e do projeto)
  - [x] Criar novo modelo clonando `default.md`
  - [x] Validador ao vivo de seções e placeholders obrigatórios
  - [x] Escolha do modelo padrão em `config.json` (`task_model`)
- [x] **5.6 Integração Reativa com SSE**
  - [x] Atualização automática do board quando arquivos mudarem externamente sem edição pendente

---

## Fase 6: Testes E2E, Validação dos Critérios de Aceite e Finalização

- [x] **6.1 Bateria de Testes E2E**
  - [x] Teste automatizado cobrindo todo o fluxo da seção 37.3 do spec
- [x] **6.2 Checklist de Aceite (§38)**
  - [x] Verificar cada um dos 28 critérios de aceitação do MVP
  - [x] Validar condição de parada (Definition of Done — §39)
- [x] **6.3 Documentação e Walkthrough**
  - [x] Atualizar README com guia de uso rápido e instruções de instalação global
  - [x] Gerar walkthrough com validações executadas
