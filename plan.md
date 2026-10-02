# Plano de Implementação — MemoryCard (MVP)

Plano técnico de engenharia e execução para desenvolvimento do **MemoryCard**, baseado integralmente na especificação definida em [spec.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/spec.md).

---

## 1. Goal Description

Construir o MVP do **MemoryCard**, um sistema global em Node.js/TypeScript para gerenciamento persistente de memória operacional e tarefas de desenvolvimento com coding agents.
O sistema armazena seu estado no filesystem local (`.memorycard/`) em arquivos Markdown e JSON, garante paridade total de regras entre CLI e interface web local (Next.js/React), oferece atualização reativa em tempo real (File Watcher + SSE), proteção contra perda de dados via escrita atômica e concorrência otimista por hash (OCC), e um sistema extensível de modelos de tasks locais e globais.

---

## 2. User Review Required

> [!IMPORTANT]
> **Decisões Arquiteturais e de Escopo Fixadas pelo spec.md:**
> 1. **Zero Banco de Dados:** Todo o estado reside no filesystem (`.memorycard/tasks/<id>.md`, `.memorycard/config.json`, e `~/.memorycard/`).
> 2. **Single Domain Layer:** O CLI e o servidor Web consumirão os mesmos módulos de serviço (`src/core/`), sem duplicar lógica de validação ou persistência.
> 3. **Sem Comandos CLI para Modelos no MVP:** Modelos são criados e configurados exclusivamente pela UI ou editando diretamente arquivos `.md` (Conforme §29).
> 4. **Identidade Visual:** Minimalista, estritamente preto e branco, alto contraste, sem gradientes ou efeitos cosméticos desnecessários (§28).
> 5. **Native Folder Picker:** O seletor de diretório para criar novos projetos na UI usará chamada de sistema nativa pelo backend Node (com fallback de entrada manual) (§7.2).

---

## 3. Open Questions

Nenhuma dúvida bloqueante identificada: o [spec.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/spec.md) cobre explicitamente todas as regras de negócio, limites de escopo, algoritmos de recuperação e critérios de aceite.

---

## 4. Proposed Changes & Architecture

A estrutura do projeto será unificada em TypeScript (Node.js + Next.js), organizada conforme sugerido em §35 do spec:

```text
memorycard/
├── package.json
├── tsconfig.json
├── bin/
│   └── memorycard.js
├── src/
│   ├── core/
│   │   ├── domain/               # Tipos e entidades (Project, Task, Todo, Comment, Model, Status)
│   │   ├── parser/               # Markdown frontmatter, parser e serializador de tarefas e modelos
│   │   └── services/             # Regras de negócio (TaskService, ProjectService, ModelService, etc.)
│   ├── storage/
│   │   ├── atomic-write.ts       # Escrita segura (.tmp -> fsync -> rename)
│   │   ├── hashing.ts            # SHA-256 para OCC
│   │   ├── project-registry.ts   # Gerenciamento de ~/.memorycard/projects.json
│   │   ├── config-file.ts        # Gerenciamento de .memorycard/config.json
│   │   ├── task-files.ts         # I/O de .memorycard/tasks/<id>.md
│   │   └── model-files.ts        # I/O de modelos globais e de projeto
│   ├── project-resolution/
│   │   └── resolve-project.ts    # Descoberta de projeto por walk-up
│   ├── watcher/
│   │   ├── project-watcher.ts    # Chokidar watcher debounced
│   │   └── event-bus.ts          # EventEmitter tipado para SSE
│   ├── cli/
│   │   ├── index.ts              # Entrypoint do CLI com Commander
│   │   └── commands/             # init, project, open, list, show, current, resume, create, edit, delete, move, todo, comment, status
│   ├── server/
│   │   ├── index.ts              # Servidor local Node HTTP / Next.js wrapper
│   │   ├── sse.ts                # Handler de Server-Sent Events
│   │   └── api-routes.ts         # Endpoints REST compartilhados com a UI
│   └── web/                      # Interface Next.js (App Router / React)
│       ├── app/                  # Rotas: / (dashboard), /[slug] (board)
│       ├── components/           # Board, TaskModal, ModelModal, Drag & Drop
│       └── hooks/                # useSSE, useTask, useProject
└── tests/
    ├── unit/                     # Testes unitários de parser, OCC, atomic write, etc.
    ├── integration/              # Testes de integração de CLI, Watcher, SSE
    └── e2e/                      # Cenário de ponta a ponta descrito no spec
```

---

### Componente 1: Foundation, Storage & Core Parsing

#### [NEW] `src/storage/atomic-write.ts`
Implementa escrita atômica segura no mesmo filesystem:
- Gera nome temporário: `<target>.<timestamp>.<rand>.tmp`
- Escreve conteúdo e realiza sync
- Executa `fs.promises.rename` sobre o arquivo de destino
- Garante limpeza do `.tmp` em caso de erro

#### [NEW] `src/storage/hashing.ts`
Calcula hash SHA-256 do conteúdo do arquivo para controle de concorrência otimista (OCC).

#### [NEW] `src/core/parser/markdown-task.ts`
Parser e serializador bidirecional para `.memorycard/tasks/<id>.md`:
- Extrai e formata YAML frontmatter (`id`, `title`, `status`, `position`, `created_at`, `updated_at`)
- Valida seções obrigatórias: `# {{title}}`, `## Description`, `## Todo`, `## Comments`
- Preserva seções customizadas introduzidas por modelos
- Manipula checkboxes de `## Todo` (`- [ ]`, `- [x]`)
- Manipula comentários com cabeçalho `### YYYY-MM-DD HH:mm`
- Formata timestamps no padrão ISO 8601 com timezone local

#### [NEW] `src/core/parser/markdown-model.ts`
Validador estrutural e motor de preenchimento de modelos de tarefas:
- Valida placeholders obrigatórios: `{{id}}`, `{{title}}`, `{{status}}`, `{{position}}`, `{{created_at}}`, `{{updated_at}}`, `{{description}}`, `{{todo}}`, `{{comments}}`
- Valida presença das seções essenciais
- Injeta metadados e conteúdo inicial ao gerar nova task a partir do modelo

#### [NEW] `src/storage/project-registry.ts`
Gerencia `~/.memorycard/projects.json` e `~/.memorycard/models/default.md`:
- Garante criação do diretório global na primeira execução
- Cria `default.md` global se não existir
- Registra projetos (`project_id`, `path`)
- Verifica disponibilidade do path
- Permite relink de projeto validando correspondência de `project.id`

#### [NEW] `src/project-resolution/resolve-project.ts`
Implementa o algoritmo de walk-up:
- Inicia no `cwd` (ou diretório especificado)
- Procura por `.memorycard/config.json`
- Sobe para o diretório pai recursivamente até a raiz
- Retorna raiz do projeto e configurações ou erro explícito `ProjectNotFoundError`

---

### Componente 2: Domain Services & OCC

#### [NEW] `src/core/services/task-service.ts`
Serviço central de tarefas:
- **Resolução de ID e High-Water Mark:** Lê `next_task_id`. Se arquivo existir, calcula `max(existing_ids) + 1` e nunca retrocede.
- **Criação:** Resolve modelo padrão (`task_model`), preenche placeholders, executa escrita atômica do arquivo e atualiza `next_task_id` no `config.json`.
- **Edição com OCC:** Exige hash original antes de salvar; compara hash atual do disco; recusa com erro de conflito caso discorde.
- **Exclusão:** Remove o arquivo `.md` sem recuar `next_task_id`.
- **Movimentação:** Altera `status`, ajusta `position`, atualiza `updated_at`.
- **Current & Resume:** `current` retorna a task `in-progress` mais recente; `resume <id>` formata estado conciso para coding agents.

#### [NEW] `src/core/services/todo-service.ts`
Gerenciamento de checklist de tarefas:
- `add(taskId, text)`: adiciona checkbox desmarcado
- `done(taskId, index)`: marca checkbox 1-indexed como `[x]`
- `undo(taskId, index)`: desmarca checkbox 1-indexed como `[ ]`
- `remove(taskId, index)`: remove linha do checkbox
- Atualiza `updated_at` e persiste via atomic write com checagem OCC

#### [NEW] `src/core/services/comment-service.ts`
Adiciona comentário no fim da seção `## Comments` com timestamp `### YYYY-MM-DD HH:mm`.

#### [NEW] `src/core/services/status-service.ts`
Gerencia colunas em `.memorycard/config.json`:
- `list()`
- `add(name, id?)`
- `rename(id, newName)`
- `remove(id)`: valida se há tasks no status antes de remover

#### [NEW] `src/core/services/model-service.ts`
Resolução e validação de modelos:
- Resolve `default` para `~/.memorycard/models/default.md`
- Para outros nomes, busca localmente em `<project>/.memorycard/models/<name>.md`, com fallback para global `~/.memorycard/models/<name>.md`
- Valida conformidade estrutural completa

---

### Componente 3: CLI Application

#### [NEW] `bin/memorycard.js` & `src/cli/index.ts`
Entrypoint executável registrado como comando global `memorycard`:
- Subcomandos mapeados com `commander`:
  - `memorycard` (sem argumentos): inicia servidor local e abre dashboard
  - `memorycard open`: abre diretamente o board do projeto no navegador
  - `memorycard init`: inicializa o projeto no cwd e registra no índice global
  - `memorycard project`: exibe dados e configuração do projeto atual
  - `memorycard list`: lista tarefas ordenadas
  - `memorycard show <id>`: exibe tarefa completa
  - `memorycard current`: exibe tarefa ativa em andamento
  - `memorycard resume <id>`: exibe resumo formatado para coding agents
  - `memorycard create [title]` (com flags `--title`, `--description` e suporte a stdin)
  - `memorycard edit <id>` (`--title`, `--description`, `--status`)
  - `memorycard delete <id>` (com prompt de confirmação)
  - `memorycard move <id> <status>`
  - `memorycard todo add|done|undo|remove`
  - `memorycard comment <id> <text>`
  - `memorycard status list|add|rename|remove`
- Suporte uniforme a `-h` e `--help` em todos os níveis
- Retorno de códigos de saída semânticos (0 para sucesso, != 0 para erro)

---

### Componente 4: Servidor Local, File Watcher & SSE

#### [NEW] `src/watcher/project-watcher.ts`
Instância Chokidar com debounce (100ms) para observar seletivamente:
- `<project>/.memorycard/config.json`
- `<project>/.memorycard/tasks/`
- `<project>/.memorycard/models/`
- `~/.memorycard/models/`

#### [NEW] `src/watcher/event-bus.ts` & `src/server/sse.ts`
Emissor de eventos SSE para o navegador:
- Eventos: `task-created`, `task-updated`, `task-deleted`, `config-updated`, `model-updated`, `project-availability-changed`
- Payload identifica `project_id` e `task_id` (quando aplicável)

#### [NEW] `src/server/index.ts` & `src/server/api-routes.ts`
Servidor HTTP integrado com Next.js:
- Endpoints REST para operações da UI delegando para `TaskService`, `ProjectService`, etc.
- Endpoint nativo para abertura de pasta (`/api/system/select-directory`) usando script PowerShell/OS local
- Inicialização dinâmica de porta com fallback

---

### Componente 5: Interface Visual Minimalista (Next.js / React)

#### [NEW] `src/web/app/page.tsx` (Dashboard Geral)
- Lista todos os projetos de `~/.memorycard/projects.json`
- Indicador visual de disponibilidade (verde/cinza)
- Ação para relink de projetos movidos com validação de `project.id`
- Botão "New Project" que aciona o seletor nativo de diretório

#### [NEW] `src/web/app/[slug]/page.tsx` (Board do Projeto)
- Renderização de colunas (Todo, In Progress, Done, customizadas)
- Drag and drop de cards entre colunas e reordenação interna (`@hello-pangea/dnd`)
- Seletor de ordenação: `updated_at`, `alphabetical`, `custom`
- Cartões com visualização de ID (`#1`), título, contador de todos e timestamp relativo
- Botão de criação de nova task

#### [NEW] `src/web/components/task-modal.tsx` (Visualização / Edição)
- Edição explícita com botão "Salvar"
- Checklist interativo de Todos (toggle imediato)
- Histórico de comentários formatado em Markdown com campo para novo comentário
- Botão de exclusão com diálogo de confirmação
- **Proteção Concorrente (OCC):**
  - Armazena hash da versão carregada
  - Listener SSE: se a task aberta sofrer alteração externa com edição pendente, exibe banner de conflito "Arquivo alterado externamente" e bloqueia o salvamento sem recarga prévia

#### [NEW] `src/web/components/model-modal.tsx` (Gerenciador de Modelos)
- Listagem de modelos disponíveis
- Criação de novo modelo clonando `default.md`
- Validação em tempo real de placeholders e seções obrigatórias
- Seleção de escopo (global ou do projeto)
- Escolha do modelo padrão em `config.json` (`task_model`)

---

## 5. Verification Plan

### Automated Tests
1. **Unit Tests (`npm run test:unit`)**:
   - `atomic-write.test.ts`: escrita atômica, integridade e limpeza de temporários.
   - `hashing.test.ts`: geração e consistência de hashes SHA-256.
   - `markdown-task.test.ts`: parsing completo, serialização, preservação de seções extras, manipulação de todos e comentários.
   - `markdown-model.test.ts`: validação de estrutura obrigatória, rejeição de templates faltantes e injeção de placeholders.
   - `task-id-recovery.test.ts`: simulação de colisões e recuperação monotônica sem retrocesso de `next_task_id`.
   - `project-resolution.test.ts`: walk-up em árvores profundas de diretórios e erro em diretórios não inicializados.
   - `slug.test.ts`: sanitização determinística de nomes de projeto.

2. **Integration Tests (`npm run test:integration`)**:
   - `cli-lifecycle.test.ts`: execução de `init`, `create`, `show`, `edit`, `move`, `todo`, `comment`, `status`, `delete`.
   - `occ-concurrency.test.ts`: simulação de escritas conflitantes concorrentes bloqueando overwrite com erro explícito.
   - `watcher-sse.test.ts`: alteração em arquivo de task disparando evento SSE correspondente.
   - `models-resolution.test.ts`: fallback de modelo local para global e persistência do `task_model`.
   - `project-relink.test.ts`: validação de sucesso e erro ao relincar pasta movida.

3. **End-to-End Acceptance Test (`npm run test:e2e`)**:
   - Execução programática do fluxo completo de §37.3:
     1. `init` de projeto temporário
     2. Criar task via CLI
     3. Ler e editar task via API
     4. Alterar task externamente via CLI
     5. Validar recepção de evento SSE
     6. Provocar conflito de hash e confirmar bloqueio
     7. Criar modelo pela UI clonando `default.md`
     8. Selecionar novo modelo e criar task validando estrutura

### Manual Verification
1. **CLI:**
   - Executar `node bin/memorycard.js init` em um diretório novo.
   - Criar tasks via CLI e verificar arquivos em `.memorycard/tasks/`.
   - Testar `memorycard resume 1` e validar a clareza para retomada de agentes.
2. **Interface Visual:**
   - Executar `node bin/memorycard.js` e verificar abertura automática no navegador.
   - Mover cards via drag and drop entre colunas e conferir a persistência no frontmatter.
   - Abrir a task no editor, editar um texto no arquivo `.md` por fora, tentar salvar na UI e confirmar o alerta de conflito OCC.
   - Criar um novo modelo a partir do `default.md`, definir como padrão e criar uma nova task.
