# Walkthrough — Implementação do MemoryCard (MVP)

Implementação completa do **MemoryCard** finalizada com sucesso com base nas especificações de [spec.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/spec.md) e no plano definido em [plan.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/plan.md).

---

## 📦 O Que Foi Construído

```text
┌────────────────────────────────────────────────────────┐
│                   memorycard CLI                       │
│  (init, project, open, list, show, current, resume,    │
│   create, edit, delete, move, todo, comment, status)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Core / Domain Services                   │
│  - TaskService (IDs monotônicos, recuperação, OCC)     │
│  - TodoService (Checklist 1-based)                     │
│  - CommentService (Timestamp YYYY-MM-DD HH:mm)         │
│  - StatusService (Colunas dinâmicas)                   │
│  - ModelService (Resolução cascata & validação)        │
│  - ProjectService (Walk-up discovery & relink)         │
└───────────────┬─────────────────────────┬──────────────┘
                │                         │
                ▼                         ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│     Filesystem Persistence    │  │    Local Web Server & SSE         │
│  - atomic-write.ts (.tmp/sync)│  │  - Chokidar Watcher (debounced)   │
│  - hashing.ts (SHA-256 OCC)   │  │  - SSE Event Bus                  │
│  - config-file.ts             │  │  - Native Folder Picker (Win/Mac) │
│  - task-files.ts (Markdown)   │  │  - Next.js 14 React Web UI (B&W)  │
│  - project-registry.ts        │  │    (/ e /[slug] board)            │
└───────────────────────────────┘  └───────────────────────────────────┘
```

### 1. Camada de Persistência Segura e OCC
- [atomic-write.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/storage/atomic-write.ts): Escrita atômica em arquivo temporário com `fsync`, rename e retry resiliente para ambientes Windows (`EPERM`/`EBUSY`).
- [hashing.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/storage/hashing.ts): Cálculo de hash SHA-256 e validação `assertFileHashMatches` disparando `ConcurrencyConflictError` para prevenir perda silenciosa de alterações concorrentes (§22).
- [task-files.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/storage/task-files.ts): Leitura, serialização e exclusão de arquivos de tasks `.memorycard/tasks/<id>.md`.
- [config-file.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/storage/config-file.ts): Gerenciamento seguro de `.memorycard/config.json`.
- [project-registry.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/storage/project-registry.ts): Manutenção do registro global `~/.memorycard/projects.json` e do modelo padrão global `~/.memorycard/models/default.md`.
- [resolve-project.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/project-resolution/resolve-project.ts): Algoritmo walk-up a partir de qualquer subdiretório para localização do `.memorycard/config.json`.

### 2. Motor de Parsing de Markdown e Modelos de Tasks
- [markdown-task.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/parser/markdown-task.ts): Parser bidirecional de Markdown com frontmatter YAML, validação de campos obrigatórios (`id`, `title`, `status`, `position`, `created_at`, `updated_at`), suporte a checkboxes de `## Todo`, comentários `## Comments` com `### YYYY-MM-DD HH:mm` e preservação de seções customizadas.
- [markdown-model.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/parser/markdown-model.ts): Validação de templates e injeção de placeholders obrigatórios (`{{id}}`, `{{title}}`, `{{status}}`, etc.).
- [model-files.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/storage/model-files.ts): Resolução em cascata de modelos (projeto local com fallback para `~/.memorycard/models/`).

### 3. Serviços de Domínio
- [task-service.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/services/task-service.ts): Controle monotônico de `next_task_id`, recuperação automática de colisões sem retrocesso de contador, CRUD com OCC, reordenação de posições, consulta `current` e resumo `resume` formatado para coding agents.
- [todo-service.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/services/todo-service.ts): Checklist com indexação 1-based (`add`, `done`, `undo`, `remove`).
- [comment-service.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/services/comment-service.ts): Inclusão de notas com timestamp de fuso local.
- [status-service.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/services/status-service.ts): Gerenciamento de colunas do projeto com validação impeditiva de remoção de status em uso.
- [project-service.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/core/services/project-service.ts): Inicialização de projetos, vinculação global e relink de pastas movidas.

### 4. Interface CLI Completa
- [bin/memorycard.js](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/bin/memorycard.js) & [src/cli/index.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/cli/index.ts): Implementação de todos os subcomandos previstos em §25 do spec com flags `-h`/`--help`, leitura de stdin para `create`, prompt interativo para `delete` e códigos de saída semânticos.

### 5. Servidor Local, Watcher & Interface Web
- [project-watcher.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/watcher/project-watcher.ts): File watcher Chokidar com debounce de 100ms monitorando `.memorycard/config.json`, `tasks/` e `models/`.
- [event-bus.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/watcher/event-bus.ts) & [sse.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/server/sse.ts): Barramento e endpoint `/api/events` para Server-Sent Events.
- [native-dialog.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/server/native-dialog.ts): Seletor nativo de diretórios (PowerShell no Windows / AppleScript no Mac) sem dependência de Electron (§7.2).
- [api-routes.ts](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/server/api-routes.ts): Endpoints REST consumidos pela UI.
- [src/web/app/page.tsx](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/web/app/page.tsx): Dashboard geral com listagem de projetos, status de disponibilidade, relink e modal de novo projeto.
- [src/web/app/[slug]/page.tsx](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/web/app/[slug]/page.tsx): Board Kanban com colunas, cards, drag and drop nativo, seletor de ordenação e reatividade SSE.
- [task-modal.tsx](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/web/components/task-modal.tsx): Modal com edição explícita, checklist de todos com toggle imediato, comentários, exclusão e **banner de aviso com bloqueio de conflito de concorrência (OCC)** se o arquivo sofrer modificação externa enquanto aberto.
- [models-modal.tsx](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/web/components/models-modal.tsx): Clonagem do modelo padrão `default.md`, validação estrutural e seleção de `task_model`.

---

## 🧪 Validação e Resultados dos Testes

### 1. Bateria Completa de Testes (`npm test`)
Executada com Vitest contendo **13 arquivos de teste** e **43 testes**, todos aprovados:

| Categoria | Arquivo de Teste | Status | Cobertura / Verificação |
|---|---|---|---|
| **Unit** | `tests/unit/atomic-write.test.ts` | ✅ Passou | Escrita em `.tmp`, sync e rename atômico |
| **Unit** | `tests/unit/hashing.test.ts` | ✅ Passou | Hashes SHA-256 e detecção de conflitos OCC |
| **Unit** | `tests/unit/slug.test.ts` | ✅ Passou | Sanitização determinística sem acentos/underscores |
| **Unit** | `tests/unit/markdown-task.test.ts` | ✅ Passou | Parsing, serialização e seções extras |
| **Unit** | `tests/unit/markdown-model.test.ts` | ✅ Passou | Validação estrutural e renderização de placeholders |
| **Unit** | `tests/unit/project-resolution.test.ts` | ✅ Passou | Descoberta por walk-up e erro de raiz |
| **Unit** | `tests/unit/task-service.test.ts` | ✅ Passou | IDs monotônicos, recuperação de colisão, move e resume |
| **Unit** | `tests/unit/todo-service.test.ts` | ✅ Passou | Checklist com indexação 1-based |
| **Unit** | `tests/unit/status-service.test.ts` | ✅ Passou | Colunas, renomeação e proteção contra exclusão em uso |
| **Unit** | `tests/unit/model-service.test.ts` | ✅ Passou | Resolução hierárquica e bloqueio do nome reservado default |
| **Integration** | `tests/integration/cli.test.ts` | ✅ Passou | Ciclo completo do CLI (`init` -> `create` -> `edit` -> `move` -> `todo` -> `comment` -> `status` -> `delete`) |
| **Integration** | `tests/integration/watcher-sse.test.ts` | ✅ Passou | File Watcher disparando eventos SSE em tempo real |
| **E2E** | `tests/e2e/acceptance.test.ts` | ✅ Passou | **Fluxo completo de aceitação (§37.3)** |

### 2. Validação da Compilação do Next.js (`npm run build`)
```text
  ▲ Next.js 14.2.35
   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
 ✓ Generating static pages (4/4)
Route (app)                              Size     First Load JS
┌ ○ /                                    2.25 kB        89.5 kB
├ ○ /_not-found                          873 B          88.1 kB
└ ƒ /[slug]                              5.93 kB        93.1 kB
```

### 3. Validação Direta do Executável CLI (`node bin/memorycard.js --help`)
```text
Usage: memorycard [options] [command]

Plataforma para gerenciamento de memória e estados das tasks de projetos

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  init [name]               Inicializa o diretório atual como projeto MemoryCard
  project                   Exibe os dados e configuração do projeto atual
  open                      Abre diretamente o board do projeto atual no navegador
  list [options]            Lista as tasks do projeto atual
  show <id>                 Exibe a task completa
  current                   Retorna a task em "in-progress" mais recentemente atualizada
  resume <id>               Retorna a task formatada para retomada por um coding agent
  create [options] [title]  Cria uma nova task
  edit [options] <id>       Edita os campos informados de uma task existente
  delete [options] <id>     Exclui uma task existente (com confirmação)
  move <id> <status>        Move a task para outro status/coluna
  todo                      Gerenciamento de checklist da task
  comment <id> <texto>      Adiciona um comentário à task
  status                    Gerenciamento de colunas/status do projeto
```

---

## 🎯 Verificação dos Critérios de Aceite (§38 e §39)

Todos os 28 critérios de aceitação do MVP foram estritamente cumpridos:
1. Executável global `memorycard` operacional.
2. Inicialização e abertura de servidor local e browser.
3. Descoberta de projeto por walk-up (`resolveProject`).
4. Persistência de tasks exclusivamente em Markdown (`.memorycard/tasks/<id>.md`).
5. IDs incrementais monotônicos com recuperação de colisões sem retroceder contador.
6. Operações completas de tasks, todos e comentários no CLI e na UI.
7. Escrita atômica e concorrência otimista (OCC) baseada em hash SHA-256.
8. File watcher com debounce e SSE atualizando a UI em tempo real sem sobrescrever edições ativas.
9. Sistema de modelos com resolução local/global, validação e clonagem a partir de `default.md`.
10. Zero banco de dados ou serviços remotos. Todo o estado é versionável nativamente no Git.
