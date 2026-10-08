# MemoryCard

> Plataforma para gerenciamento de memória operacional e estados de tarefas para projetos desenvolvidos com coding agents.

O **MemoryCard** preserva o estado das tasks fora da janela de contexto dos modelos de linguagem (LLMs), permitindo que humano e agente de IA retomem o trabalho com histórico consistente sem depender do chat anterior.

---

## ⚡ Princípios do MVP

1. **Local-first:** Os dados do projeto residem exclusivamente no filesystem local.
2. **Filesystem como fonte da verdade:** Zero banco de dados. Tasks são persistidas em arquivos Markdown (`.memorycard/tasks/<id>.md`).
3. **Paridade CLI e UI:** Mesma camada de domínio em Node.js/TypeScript para comandos no terminal e visualização visual.
4. **Sem perda silenciosa de alterações:** Escrita segura com atomic write (`.tmp -> fsync -> rename`) e detecção de conflitos de concorrência por hash SHA-256 (OCC).
5. **IDs Humanos e Monotônicos:** IDs numéricos sequenciais por projeto (`1, 2, 3...`) que nunca são reutilizados e recuperam colisões automaticamente.
6. **Atualização Reativa:** File watcher seletivo com debounce e Server-Sent Events (SSE) atualizam o board local em tempo real.
7. **Versionamento Git:** A pasta `.memorycard/` é versionada normalmente no repositório.
8. **Pronto para Agentes de IA:** Inclui skill pronta e distribuível em `skills/memorycard/SKILL.md` para integração imediata com coding agents.

---

## 🚀 Instalação e Uso Rápido

### Instalação local ou global
```bash
# Instalação das dependências
npm install

# Link simbólico para usar o comando "memorycard" globalmente
npm link
```

### 1. Inicializar um projeto
No diretório raiz do seu repositório:
```bash
memorycard init
```
Cria a estrutura `.memorycard/` com `config.json`, `tasks/` e `models/`, e registra o projeto no índice global `~/.memorycard/projects.json`.

### 2. Criar e gerenciar tarefas pelo CLI
```bash
# Criar nova task
memorycard create "Implementar autenticação" -d "Configurar login com sessão e persistência"

# Visualizar task completa
memorycard show 1

# Adicionar item ao checklist
memorycard todo add 1 "Criar rota de login"
memorycard todo done 1 1

# Adicionar comentário com timestamp
memorycard comment 1 "Login validado com sucesso"

# Mover task de coluna
memorycard move 1 in-progress

# Retomada por coding agent
memorycard resume 1
```

### 3. Abrir a Interface Visual
```bash
# Abre o dashboard geral com todos os projetos registrados
memorycard

# Ou abre diretamente o board do projeto atual
memorycard open
```

### 4. Usar a Skill com Agentes de IA (em qualquer projeto)

O MemoryCard acompanha uma **Skill pronta** em [`skills/memorycard/SKILL.md`](skills/memorycard/SKILL.md) para permitir que coding agents (como Google Antigravity, Cursor, Claude Code, etc.) operem o MemoryCard autonomamente.

A skill ensina o modelo a:
- **Validar instalação:** Detectar se `memorycard` está disponível no PATH e alertar caso o repositório esteja presente mas falte executar `npm link` (ou orientar instalação global).
- **Alinhar antes de codar:** Perguntar se deve criar ou atualizar uma task antes de iniciar uma nova feature ou correção.
- **Interpretar pedidos cotidianos:** Responder a comandos como *"onde a gente parou?"*, *"detalha os passos da task"*, *"marca o passo 2 como concluído"* e *"move para done"*.

#### Como instalar a skill em outro projeto
Para que um agente de IA gerencie tarefas usando o MemoryCard em **qualquer outro repositório** sem precisar reexplicar o fluxo:

```bash
# Opção 1: Via degit (baixa diretamente a pasta da skill)
npx degit covil-works/memorycard/skills/memorycard skills/memorycard

# Opção 2: Cópia manual
# Copie a pasta skills/memorycard/ para a raiz do seu novo projeto
```

---

## 🛠️ Referência do CLI

| Comando | Descrição |
|---|---|
| `memorycard` | Inicia o servidor local e abre o dashboard geral no navegador |
| `memorycard open` | Resolve o projeto atual (via walk-up) e abre o board no navegador |
| `memorycard init [name]` | Inicializa o diretório atual como projeto MemoryCard |
| `memorycard project` | Exibe as configurações do projeto atual |
| `memorycard list` | Lista as tasks do projeto (suporta `--sort` e `--status`) |
| `memorycard show <id>` | Exibe detalhes completos da task |
| `memorycard current` | Retorna a task em `in-progress` mais recente |
| `memorycard resume <id>` | Formata a task de forma concisa para retomada por LLMs |
| `memorycard create [title]` | Cria task (suporta `-t`, `-d`, `-s`, `-m` e stdin) |
| `memorycard edit <id>` | Edita campos informados (`-t`, `-d`, `-s`) |
| `memorycard delete <id>` | Exclui a task com confirmação (ou `-y`) |
| `memorycard move <id> <status>` | Move a task para outro status/coluna |
| `memorycard todo add <id> <txt>` | Adiciona um item ao checklist |
| `memorycard todo done <id> <n>` | Marca item `n` (1-based) como concluído |
| `memorycard todo undo <id> <n>` | Desmarca item `n` (1-based) |
| `memorycard todo remove <id> <n>` | Remove item `n` do checklist |
| `memorycard comment <id> <txt>` | Adiciona comentário com timestamp local |
| `memorycard status list` | Lista as colunas configuradas |
| `memorycard status add <name>` | Adiciona nova coluna |
| `memorycard status rename <id> <new>` | Renomeia uma coluna |
| `memorycard status remove <id>` | Remove uma coluna vazia |

Todos os comandos suportam a flag `-h` / `--help`.

---

## 📁 Estrutura de Arquivos

```text
<project-root>/
└── .memorycard/
    ├── config.json         # Metadados do projeto, colunas, ordenação e task_model
    ├── tasks/
    │   ├── 1.md            # Arquivo Markdown com frontmatter YAML
    │   ├── 2.md
    │   └── ...
    └── models/
        └── <model-name>.md # Modelos específicos do projeto
```

E no diretório do usuário:
```text
~/.memorycard/
├── projects.json           # Índice de projetos conhecidos
└── models/
    └── default.md          # Modelo base global do MemoryCard
```

---

## 🧪 Testes Automatizados

O projeto conta com baterias completas de testes unitários, integração e aceitação end-to-end:

```bash
# Executa todos os testes
npm test

# Executa testes unitários
npm run test:unit

# Executa testes de integração (CLI, Watcher e SSE)
npm run test:integration

# Executa teste E2E do ciclo completo de aceitação (§37.3)
npm run test:e2e
```
