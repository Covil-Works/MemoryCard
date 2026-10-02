# MemoryCard — Software Design Document (MVP)

## 1. Objetivo deste documento

Este documento define o design técnico e os critérios de implementação do MVP do **MemoryCard**.

Ele deve ser tratado pelo agente implementador como a especificação principal para arquitetura, comportamento, persistência, CLI, interface local e critérios de conclusão.

O objetivo do MVP é criar uma memória operacional persistente de tasks para projetos desenvolvidos com agentes de IA, acessível tanto pelo CLI quanto por uma interface visual local.

---

## 2. Objetivo do produto

O MemoryCard deve preservar o estado operacional de tasks fora da janela de contexto do agente, permitindo que humano e agente retomem trabalho posteriormente sem depender do histórico completo de uma conversa.

O produto deve permitir que:

- tasks sejam registradas e atualizadas por agentes via CLI;
- as mesmas tasks sejam visualizadas e editadas por humanos via interface local;
- o estado fique persistido dentro do próprio projeto;
- o Git do projeto registre naturalmente o histórico dessas alterações;
- uma task possa ser retomada futuramente pelo seu ID.

**Público-alvo:** desenvolvedores solo e equipes pequenas que trabalham em projetos com coding agents.

---

## 3. Princípios do MVP

1. **Local-first.** Os dados do projeto ficam no filesystem local.
2. **Filesystem como fonte da verdade.** Não existe banco de dados no MVP.
3. **Mesmos dados para CLI e UI.** CLI e interface visual leem e escrevem os mesmos arquivos.
4. **Legível por humanos e agentes.** Tasks são Markdown simples.
5. **Baixa complexidade operacional.** O fluxo principal não depende de APIs externas, cloud própria ou serviços pagos.
6. **IDs humanos.** Tasks usam IDs inteiros incrementais e facilmente referenciáveis.
7. **Sem perda silenciosa de alterações.** Escritas concorrentes devem ser detectadas antes de persistir.
8. **Atualização reativa da interface.** Alterações no filesystem devem refletir na UI quase imediatamente.

---

## 4. Arquitetura geral

O MemoryCard é um programa instalado no sistema e executável globalmente pelo comando:

```bash
memorycard
```

Ele não é um processo separado instalado dentro de cada repositório.

Cada projeto gerenciado possui apenas seu estado local em:

```text
<project-root>/.memorycard/
```

A arquitetura possui três partes principais:

```text
┌──────────────────────────┐
│       memorycard CLI     │
└────────────┬─────────────┘
             │
             │ usa a mesma camada de domínio
             ▼
┌──────────────────────────┐
│   Core / Domain Layer    │
│  Node.js + TypeScript    │
└───────┬─────────┬────────┘
        │         │
        │         └──────────────┐
        ▼                        ▼
┌───────────────┐       ┌──────────────────────┐
│ Filesystem    │       │ Local Web Server     │
│ .memorycard/  │       │ React / Next.js UI   │
└───────────────┘       └──────────────────────┘
```

CLI e UI não devem possuir regras de domínio independentes. Ambas devem chamar a mesma camada de aplicação para operações sobre projetos e tasks.

---

## 5. Execução do programa

### 5.1 `memorycard`

Executar apenas:

```bash
memorycard
```

deve:

1. iniciar o servidor local do MemoryCard;
2. disponibilizar a interface via localhost;
3. abrir a interface principal no navegador padrão, quando possível.

A interface principal lista todos os projetos registrados e disponíveis.

### 5.2 `memorycard open`

Executado dentro de um projeto MemoryCard, deve:

1. resolver o projeto correspondente ao diretório atual;
2. garantir que o servidor local esteja disponível;
3. abrir diretamente o board daquele projeto.

### 5.3 Projeto atual no CLI

Comandos relacionados a projeto ou task devem descobrir automaticamente o projeto atual.

O algoritmo é equivalente conceitualmente à descoberta de repositório do Git:

```text
cwd
 ↓
procurar .memorycard/config.json
 ↓
se não existir, subir para o diretório pai
 ↓
repetir até encontrar ou alcançar a raiz do filesystem
```

Exemplo:

```text
/home/user/projects/my-app/src/components
/home/user/projects/my-app/src
/home/user/projects/my-app        <- .memorycard encontrado
```

Se nenhum projeto for encontrado, comandos que dependem de projeto devem retornar erro explícito.

---

## 6. Registro global de projetos

Para alimentar o dashboard geral, o MemoryCard mantém um registro global de projetos conhecidos.

Estrutura conceitual:

```text
~/.memorycard/
├── projects.json
└── models/
    └── default.md
```

`projects.json` é apenas um índice de localização.

A pasta global `models/` guarda modelos compartilhados pelo MemoryCard. Nenhum desses dados substitui os arquivos `.memorycard/` como fonte da verdade do estado de cada projeto.

Exemplo:

```json
{
  "projects": [
    {
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "path": "/home/user/projects/ratatui"
    }
  ]
}
```

### 6.1 Regras

- ao iniciar, o MemoryCard deve garantir que `~/.memorycard/`, `projects.json`, `models/` e `models/default.md` existam;
- se `default.md` não existir na primeira inicialização, criá-lo a partir do modelo base definido neste documento;
- `memorycard init` registra o projeto nesse índice.
- A criação de projeto pela UI deve executar a mesma operação lógica.
- O `project_id` identifica o projeto de forma estável.
- O path pode mudar sem alterar a identidade do projeto.
- Se o path registrado deixar de existir, o projeto deve ser mostrado como indisponível.
- Um projeto indisponível pode ser relinkado para outro path.
- O relink só deve ser aceito se o `project.id` encontrado no novo path corresponder ao projeto registrado.

---

## 7. Inicialização de projeto

### 7.1 CLI

```bash
memorycard init
```

Inicializa o diretório atual como projeto MemoryCard.

Deve criar:

```text
.memorycard/
├── config.json
├── tasks/
└── models/
```

Também deve registrar o projeto no índice global.

### 7.2 Interface

Na interface principal, `New Project` deve permitir que o usuário selecione visualmente um diretório do sistema.

O seletor deve ser controlado pela camada local Node do MemoryCard. A UX não deve exigir que o usuário digite manualmente o path como fluxo principal.

Após escolher a pasta, o backend executa a mesma inicialização lógica de `memorycard init`.

A escolha específica de biblioteca/adaptador para o diálogo nativo é detalhe de implementação, desde que:

- seja executada pelo processo local;
- o backend obtenha o path real selecionado;
- a solução não transforme o MemoryCard em aplicação Electron no MVP;
- o comportamento permaneça local-first.

---

## 8. Identidade do projeto

Cada projeto possui um UUID interno estável.

Exemplo de `config.json`:

```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Projeto X"
  }
}
```

### 8.1 Regras

- `project.id` é criado uma única vez no `init`.
- não muda quando o projeto é renomeado;
- não muda quando a pasta é movida;
- não é usado como ID visível de task;
- seu objetivo é reconhecer a identidade persistente do projeto.

---

## 9. Slug do projeto

O slug é derivado automaticamente de `project.name`.

Regras:

- minúsculo;
- sem espaços;
- sem `_`;
- sem acentos;
- sem caracteres especiais.

O slug é determinístico e não precisa ser persistido no `config.json`.

Uso principal:

```text
/<project-slug>
```

---

## 10. Estrutura local do projeto

```text
<project-root>/
└── .memorycard/
    ├── config.json
    ├── tasks/
    │   ├── 1.md
    │   ├── 2.md
    │   └── ...
    └── models/
        └── <model-name>.md
```

A pasta `.memorycard/` faz parte do repositório Git e deve ser commitada normalmente.

---

## 11. Configuração do projeto

Arquivo:

```text
.memorycard/config.json
```

Formato inicial:

```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Projeto X"
  },
  "next_task_id": 1,
  "columns": [
    { "id": "todo", "name": "Todo", "order": 0 },
    { "id": "in-progress", "name": "In Progress", "order": 1 },
    { "id": "done", "name": "Done", "order": 2 }
  ],
  "board": {
    "sort": "updated_at"
  },
  "task_model": "default"
}
```

### 11.1 Responsabilidades do `config.json`

O arquivo guarda apenas configuração de projeto, board e seleção do modelo de task.

`task_model` guarda o nome, sem extensão, do modelo usado por padrão ao criar novas tasks naquele projeto.

Exemplo:

```json
"task_model": "default"
```

Tasks e conteúdo de modelos nunca devem ser armazenados no `config.json`.

---

## 12. Modelo de task

Cada task é um único arquivo Markdown.

Nome físico:

```text
.memorycard/tasks/<id>.md
```

Exemplo:

```text
.memorycard/tasks/4858.md
```

O título não participa do nome do arquivo.

Isso permite renomear a task sem renomear o arquivo e mantém o ID como referência estável.

---

## 13. Formato do arquivo de task

```markdown
---
id: 4858
title: Implementar autenticação
status: in-progress
position: 2
created_at: 2026-10-01T14:30:00-03:00
updated_at: 2026-10-02T12:15:00-03:00
---

# Implementar autenticação

## Description

Implementar autenticação do usuário e persistência da sessão.

## Todo

- [x] Criar estrutura inicial
- [x] Implementar login
- [ ] Implementar persistência da sessão
- [ ] Adicionar testes

## Comments

### 2026-10-02 11:30

Login implementado e validado.

### 2026-10-02 12:05

A persistência ainda precisa tratar sessão expirada.
```

### 13.1 Fonte da verdade

O `.md` é a fonte da verdade da task.

Não deve existir representação persistida duplicada da task em banco, cache ou JSON paralelo.

---

## 14. IDs de task

Tasks usam IDs inteiros incrementais por projeto.

Exemplo:

```text
1
2
3
...
3506
3507
```

### 14.1 Regras

- a primeira task recebe ID `1`;
- IDs são únicos apenas dentro do projeto;
- IDs nunca são reutilizados;
- apagar uma task não libera seu ID;
- `next_task_id` é um high-water mark monotônico.

Exemplo:

```text
next_task_id = 4
```

Criação da task `4`:

```text
next_task_id = 5
```

Se a task `4` for apagada, `next_task_id` permanece `5`.

### 14.2 Recuperação de inconsistência

Antes de criar uma task:

1. obter `next_task_id`;
2. verificar se `<next_task_id>.md` já existe;
3. se não existir, usar esse ID;
4. se existir, considerar o contador inconsistente;
5. calcular `max(existing_task_ids) + 1`;
6. atualizar `next_task_id`;
7. criar a task com o novo ID.

Se `next_task_id` for maior que todos os IDs existentes, ele deve ser preservado.

Não recalcular para baixo.

---

## 15. Estados e board

Estados padrão:

1. Todo
2. In Progress
3. Done

Colunas adicionais podem ser criadas pelo usuário.

O campo:

```yaml
status: in-progress
```

determina a coluna atual da task.

Mover uma task de coluna altera somente o frontmatter; o arquivo continua em `.memorycard/tasks/`.

---

## 16. Ordenação

O board suporta:

```text
updated_at
alphabetical
custom
```

### 16.1 `updated_at`

Ordena pelas tasks mais recentemente atualizadas.

### 16.2 `alphabetical`

Ordena pelo título.

### 16.3 `custom`

Usa o campo:

```yaml
position: 2
```

O drag and drop dentro da coluna deve atualizar as posições necessárias.

Ao reordenar manualmente, o board passa para `custom`.

---

## 17. Drag and drop

O board permite:

- mover task entre colunas;
- reordenar task dentro da mesma coluna.

Movimentação entre colunas deve atualizar:

```text
status
position
updated_at
```

Reordenação dentro da mesma coluna deve atualizar as posições afetadas e `updated_at` da task movimentada.

A implementação deve manter posições determinísticas e consistentes após a operação.

---

## 18. Todos

Todos são checkboxes Markdown dentro de `## Todo`.

Exemplo:

```markdown
- [ ] Implementar persistência
- [x] Criar testes
```

A ordem visual define o índice usado pelo CLI.

O MVP suporta:

- adicionar;
- marcar como concluído;
- desfazer conclusão;
- remover.

---

## 19. Comentários

Comentários ficam em `## Comments`.

Formato:

```markdown
### YYYY-MM-DD HH:mm

Texto em Markdown.
```

Novos comentários são adicionados ao final da seção.

---

## 20. Timestamps

Tasks possuem:

```yaml
created_at
updated_at
```

Devem usar timestamp ISO 8601 com timezone local.

`created_at` é imutável.

`updated_at` deve mudar em qualquer alteração persistente da task.

---

## 21. Persistência segura

Nenhuma operação deve escrever diretamente sobre o arquivo final de maneira suscetível a deixar conteúdo parcial.

Toda escrita deve seguir o padrão:

```text
serializar conteúdo
↓
escrever arquivo temporário no mesmo filesystem
↓
flush/close
↓
rename atômico para o arquivo final
```

Exemplo conceitual:

```text
4858.md.tmp
    ↓ rename
4858.md
```

A mesma regra deve ser aplicada ao `config.json`, ao registro global de projetos e aos arquivos de modelo criados ou editados pelo MemoryCard.

---

## 22. Concorrência otimista por hash

O MVP não usa locks exclusivos de arquivo.

Para evitar perda silenciosa de alterações, deve usar optimistic concurrency control baseado em hash do conteúdo.

### 22.1 Fluxo

Ao carregar um documento editável:

```text
arquivo atual
↓
conteúdo
↓
hash do conteúdo
```

O hash é mantido apenas durante a sessão de edição.

Antes de salvar:

1. reler o arquivo atual;
2. recalcular seu hash;
3. comparar com o hash original da sessão de edição.

Se forem iguais:

```text
save permitido
```

Se forem diferentes:

```text
CONFLICT
```

A escrita deve ser recusada.

### 22.2 Regra de conflito

Nunca aplicar automaticamente “última escrita vence” quando uma edição foi iniciada sobre uma versão anterior.

A UI deve informar que a task foi alterada externamente e exigir recarregamento antes de novo salvamento.

### 22.3 Por que hash

A detecção não deve depender apenas de `updated_at`, pois um arquivo pode ser editado manualmente fora do MemoryCard.

Qualquer mudança no conteúdo deve invalidar o hash anterior.

---

## 23. Salvamento na interface

Edições humanas feitas pela UI devem possuir salvamento explícito.

Exemplo:

```text
abrir task
↓
editar
↓
Save
↓
verificação de hash
↓
persistência
```

Editar um campo não deve necessariamente persistir a cada tecla.

Operações unitárias explícitas, como marcar um checkbox, mover um card ou adicionar um comentário, podem persistir imediatamente porque a própria interação representa uma confirmação da ação.

---

## 24. Atualização em tempo real da interface

A UI deve refletir alterações do filesystem quase imediatamente.

Exemplo:

```text
agente executa CLI
↓
15.md muda
↓
file watcher detecta
↓
servidor publica evento
↓
UI recebe
↓
UI atualiza o estado relevante
```

### 24.1 File watcher

O processo Node deve observar somente as áreas necessárias:

```text
<project>/.memorycard/config.json
<project>/.memorycard/tasks/
<project>/.memorycard/models/
~/.memorycard/models/
```

Não observar o repositório inteiro. O diretório global de modelos deve ser observado apenas para refletir alterações de modelos globais na UI.

A implementação pode usar uma biblioteca de file watching robusta, como Chokidar, para normalizar diferenças de filesystem entre plataformas e lidar adequadamente com atomic writes.

### 24.2 Transporte servidor → UI

Como o requisito principal é comunicação unidirecional servidor → browser, utilizar Server-Sent Events (SSE) como transporte padrão do MVP.

WebSocket não é necessário no MVP.

### 24.3 Eventos mínimos

A implementação deve possuir eventos equivalentes a:

```text
task-created
task-updated
task-deleted
config-updated
model-updated
project-availability-changed
```

O payload deve identificar no mínimo:

```text
project_id
task_id, quando aplicável
```

### 24.4 Alteração externa sem edição local

Se a UI não possuir alterações locais pendentes para aquele recurso:

```text
receber evento
↓
recarregar estado atual
↓
atualizar interface
```

### 24.5 Alteração externa durante edição local

Se a UI possuir alterações locais ainda não salvas:

- não substituir o formulário;
- não descartar alterações locais;
- marcar a sessão como potencialmente conflitante;
- informar que o documento foi alterado externamente;
- exigir `Reload` para carregar a versão atual;
- impedir `Save` se o hash não corresponder.

O file watcher reduz conflitos, mas o hash continua sendo a proteção definitiva.

---

## 25. CLI do MVP

Não adicionar comandos além dos definidos nesta seção.

### Projeto

```bash
memorycard init
memorycard project
memorycard open
```

### Consulta

```bash
memorycard list
memorycard show <id>
memorycard current
memorycard resume <id>
```

### Task

```bash
memorycard create "Título"
memorycard create --title "..." --description "..."
memorycard edit <id> --title "..." --description "..." --status <status>
memorycard delete <id>
memorycard move <id> <status>
```

`create` também aceita stdin como entrada alternativa.

### Todo

```bash
memorycard todo add <id> "texto"
memorycard todo done <id> <n>
memorycard todo undo <id> <n>
memorycard todo remove <id> <n>
```

### Comentários

```bash
memorycard comment <id> "texto"
```

### Estados

```bash
memorycard status list
memorycard status add
memorycard status rename
memorycard status remove
```

### Ajuda

```bash
memorycard -h
memorycard --help
```

Subcomandos também devem suportar:

```text
-h
--help
```

---

## 26. Semântica dos principais comandos

### `memorycard project`

Mostra os dados/configuração do projeto resolvido pelo cwd.

### `memorycard list`

Lista tasks do projeto atual respeitando a ordenação solicitada ou configurada.

### `memorycard show <id>`

Exibe a task completa.

### `memorycard create`

Cria uma nova task usando o próximo ID incremental disponível.

### `memorycard edit`

Edita somente os campos explicitamente informados.

### `memorycard delete`

Exige confirmação antes de apagar.

### `memorycard move`

Altera o status/coluna da task.

### `memorycard resume <id>`

Retorna a task em formato adequado para retomada de trabalho por um coding agent.

Não deve recuperar histórico completo de conversa. Deve retornar somente o estado persistido relevante da task.

### `memorycard current`

Retorna a task em `in-progress` mais recentemente atualizada.

---

## 27. Interface visual

### 27.1 Página raiz

Deve mostrar os projetos registrados.

Para cada projeto, mostrar pelo menos:

- nome;
- disponibilidade;
- ação para abrir.

Também deve permitir criar/inicializar novo projeto.

### 27.2 Board

Rota conceitual:

```text
/<project-slug>
```

O board mostra:

- colunas;
- cards das tasks;
- drag and drop;
- ordenação configurável;
- criação e edição de tasks;
- todos;
- comentários;
- exclusão com confirmação.

### 27.3 Paridade funcional

As operações principais existentes na UI devem ser equivalentes às operações centrais do CLI.

---

## 28. Identidade visual

Interface simples e minimalista.

Diretrizes:

- preto e branco;
- sem gradientes;
- sem ornamentação desnecessária;
- foco em legibilidade e densidade operacional adequada;
- comportamento de board deve ser funcional antes de decorativo.

---

## 29. Modelos de task e agent instructions

Modelos de task e agent instructions são conceitos separados.

Neste MVP, o gerenciamento de **modelos de task** é feito pela UI ou diretamente pelos arquivos Markdown. Não criar comandos CLI para gerenciamento de modelos.

### 29.1 Armazenamento global de modelos

O MemoryCard mantém modelos globais em:

```text
~/.memorycard/models/
```

Deve existir obrigatoriamente:

```text
~/.memorycard/models/default.md
```

`default.md` é o modelo base global do MemoryCard e deve existir mesmo quando nenhum projeto tiver modelos próprios.

O arquivo global `default.md` não deve ser apagado pela UI.

### 29.2 Modelos específicos de projeto

Cada projeto pode possuir modelos próprios em:

```text
<project-root>/.memorycard/models/
```

Exemplo:

```text
.memorycard/models/sdd.md
.memorycard/models/bugfix.md
```

Esses arquivos pertencem ao projeto, são versionados pelo Git juntamente com `.memorycard/` e podem ser criados manualmente pelo usuário ou pela UI.

O nome `default.md` é reservado ao modelo global e não deve ser usado por um modelo local de projeto.

### 29.3 Estrutura mínima obrigatória

Todo modelo de task deve preservar a estrutura mínima necessária para gerar uma task válida.

O modelo global `default.md` deve representar, no mínimo, a estrutura abaixo:

```markdown
---
id: {{id}}
title: {{title}}
status: {{status}}
position: {{position}}
created_at: {{created_at}}
updated_at: {{updated_at}}
---

# {{title}}

## Description

{{description}}

## Todo

{{todo}}

## Comments

{{comments}}
```

Os placeholders representam valores preenchidos pelo MemoryCard durante a criação da task.

São obrigatórios em qualquer modelo:

- `id`;
- `title`;
- `status`;
- `position`;
- `created_at`;
- `updated_at`;
- heading `Description`;
- heading `Todo`;
- heading `Comments`.

Um modelo pode adicionar outras seções livremente, por exemplo:

```markdown
## Architecture Decisions
```

ou transformar a task em um formato mais especializado, desde que não remova nem invalide a estrutura mínima obrigatória.

### 29.4 Criação de modelo pela UI

Ao escolher `New Model`, a UI deve:

```text
ler o modelo global default.md
↓
carregar seu conteúdo no editor
↓
permitir edição
↓
usuário escolhe nome e escopo
↓
validar estrutura obrigatória
↓
salvar como novo arquivo .md
```

A criação de um novo modelo deve sempre começar como uma cópia editável do `default.md`. Isso reduz a chance de o usuário remover inadvertidamente campos necessários.

O usuário deve escolher se o novo modelo será:

- global, salvo em `~/.memorycard/models/<name>.md`; ou
- específico do projeto atual, salvo em `.memorycard/models/<name>.md`.

O nome informado pela UI é convertido para um nome de arquivo `.md` válido. O arquivo não pode sobrescrever `default.md` durante a criação de um novo modelo.

### 29.5 Validação de modelo

Antes de salvar um modelo criado ou editado pela UI, o MemoryCard deve validar sua estrutura.

Se qualquer campo ou seção obrigatória estiver ausente ou inválida:

```text
save recusado
```

A UI deve indicar quais elementos obrigatórios estão faltando.

Não salvar parcialmente um modelo inválido.

Arquivos adicionados manualmente em `models/` também devem ser validados antes de serem usados para criar uma task. Um modelo manual inválido permanece no filesystem, mas não pode ser selecionado/empregado como modelo válido até ser corrigido.

### 29.6 Resolução de modelos

O projeto seleciona seu modelo padrão através de:

```json
"task_model": "default"
```

A resolução deve seguir esta ordem:

1. se `task_model` for `default`, usar sempre o `~/.memorycard/models/default.md` global;
2. para qualquer outro nome, procurar primeiro `.memorycard/models/<name>.md` no projeto atual;
3. se não existir localmente, procurar `~/.memorycard/models/<name>.md`;
4. se não existir ou for inválido em ambos os locais, impedir a criação da task e retornar erro claro.

Assim, um projeto pode usar um modelo global compartilhado ou possuir uma versão específica daquele modelo dentro do próprio repositório.

### 29.7 Seleção do modelo padrão do projeto

A UI deve permitir escolher qual modelo válido será usado por padrão pelo projeto.

Ao salvar essa seleção, atualizar:

```text
.memorycard/config.json -> task_model
```

Novas tasks usam o modelo selecionado. Alterar `task_model` não modifica tasks existentes.

### 29.8 Agent instructions

Agent instructions continuam sendo um conceito separado dos modelos de task.

No MVP, não criar comandos CLI adicionais para agent instructions. Qualquer armazenamento e edição implementados para esse conceito devem permanecer textuais, locais e versionáveis, sem interferir no mecanismo de modelos definido acima.

---

## 30. Git

A pasta `.memorycard/` deve ser versionada normalmente.

O MVP não implementa histórico próprio.

O Git do projeto é responsável por:

- histórico de alterações;
- diff;
- reversão;
- compartilhamento entre membros da equipe.

O MemoryCard não deve automaticamente criar commits.

---

## 31. Uso em equipe

O MVP prioriza uso individual.

Equipes pequenas podem compartilhar `.memorycard/` através do Git.

A aplicação deve documentar a limitação de conflitos de merge quando duas pessoas alterarem o mesmo arquivo de task.

O MVP não implementa resolução automática de conflitos Git.

---

## 32. Erros esperados

A implementação deve possuir erros claros para pelo menos:

- comando executado fora de projeto;
- ID de task inexistente;
- arquivo de task inválido;
- `config.json` inválido;
- status inexistente;
- conflito de hash;
- path de projeto registrado que não existe mais;
- `project.id` incompatível durante relink;
- tentativa de inicializar projeto já inicializado;
- falha de escrita no filesystem.

Erros de CLI devem resultar em exit code diferente de zero.

---

## 33. Validação de arquivos

Ao ler uma task, validar no mínimo:

```text
id
title
status
position
created_at
updated_at
Description
Todo
Comments
```

Não alterar silenciosamente um arquivo manualmente editado que esteja inválido.

Operações de escrita devem falhar com mensagem clara quando não for possível preservar a estrutura esperada.

O MVP não precisa implementar resolução automática de arquivos Markdown inválidos.

---

## 34. Stack técnica

### Runtime e domínio

```text
Node.js
TypeScript
```

### Interface

```text
React
Next.js
```

### Persistência

```text
filesystem local
Markdown
JSON
```

### Atualização da UI

```text
file watcher
SSE
```

Não existe banco de dados no MVP.

---

## 35. Separação de módulos sugerida

A implementação deve manter responsabilidades separadas. Os nomes abaixo são conceituais, não obrigatórios.

```text
src/
├── core/
│   ├── projects/
│   ├── tasks/
│   ├── todos/
│   ├── comments/
│   ├── models/
│   └── statuses/
├── storage/
│   ├── task-files.ts
│   ├── config-file.ts
│   ├── project-registry.ts
│   ├── model-files.ts
│   ├── atomic-write.ts
│   └── hashing.ts
├── project-resolution/
├── watcher/
├── cli/
├── server/
└── web/
```

A regra principal é arquitetural:

**CLI e UI não devem duplicar regras de manipulação de tasks.**

---

## 36. Fluxos críticos

### 36.1 Criar projeto por CLI

```text
memorycard init
↓
validar diretório
↓
gerar project.id
↓
criar .memorycard/
↓
criar config.json
↓
criar tasks/
↓
criar models/
↓
registrar no índice global
```

### 36.2 Criar task

```text
resolver projeto
↓
ler config
↓
resolver próximo ID
↓
criar Markdown
↓
atomic write
↓
atualizar next_task_id
↓
atomic write config
```

A implementação deve ordenar as escritas para evitar reutilização acidental de ID após falha parcial.

### 36.3 Editar task na UI

```text
abrir task
↓
calcular hash
↓
usuário edita localmente
↓
Save
↓
reler arquivo
↓
comparar hash
├── diferente → conflito
└── igual → serializar + atomic write
```

### 36.4 Alteração via CLI com UI aberta

```text
CLI altera task
↓
atomic write
↓
watcher detecta
↓
SSE
↓
UI recebe evento
↓
recarrega task/board
```

### 36.5 Conflito durante edição

```text
UI abriu versão A
↓
agente salva versão B
↓
watcher avisa UI
↓
UI possui edição local
↓
não sobrescrever formulário
↓
marcar conflito externo
↓
Save compara hash
↓
falha
↓
usuário recarrega
```

### 36.6 Criar modelo pela UI

```text
New Model
↓
ler ~/.memorycard/models/default.md
↓
abrir cópia editável
↓
usuário altera conteúdo e escolhe nome/escopo
↓
validar campos e seções obrigatórias
├── inválido → bloquear save e informar faltantes
└── válido → atomic write em models/<name>.md
```

### 36.7 Criar task usando modelo

```text
resolver projeto
↓
ler config.task_model
↓
resolver modelo local/global
↓
validar modelo
↓
resolver próximo ID e metadados
↓
preencher placeholders obrigatórios
↓
gerar Markdown da task
↓
atomic write
```

---

## 37. Testes obrigatórios

### 37.1 Unitários

Cobrir pelo menos:

- geração e recuperação de task ID;
- parsing de Markdown;
- serialização de Markdown;
- manipulação de todos;
- manipulação de comentários;
- mudança de status;
- ordenação;
- slug;
- project resolution por walk-up;
- hashing;
- detecção de conflito;
- atomic write;
- validação estrutural de modelos;
- resolução de modelo local/global;
- preenchimento dos placeholders obrigatórios.

### 37.2 Integração

Cobrir pelo menos:

- `init` criando estrutura válida;
- criação + leitura de task;
- edição por CLI refletindo no arquivo;
- UI/API lendo o mesmo arquivo;
- exclusão;
- drag/move refletindo frontmatter;
- file watcher detectando mudança externa;
- evento SSE chegando ao cliente;
- conflito de hash bloqueando overwrite;
- recuperação de `next_task_id` inconsistente;
- relink de projeto usando `project.id`;
- criação de modelo pela UI a partir de `default.md`;
- rejeição de modelo sem estrutura obrigatória;
- seleção de `task_model` no projeto;
- criação de task usando modelo global;
- criação de task usando modelo específico do projeto.

### 37.3 End-to-end

Cobrir o fluxo mínimo:

```text
init projeto
→ criar task via CLI
→ abrir UI
→ ver task
→ editar task pela UI
→ salvar
→ alterar task via CLI
→ observar atualização na UI
→ provocar conflito de edição
→ confirmar bloqueio do save
→ criar modelo pela UI a partir do default
→ selecionar o novo modelo no projeto
→ criar task e confirmar a estrutura do modelo
```

---

## 38. Critérios de aceitação do MVP

O MVP é considerado funcional quando todos os pontos abaixo forem verdadeiros:

- `memorycard` pode ser executado globalmente no terminal;
- o comando inicia e abre a interface local;
- `memorycard init` inicializa um projeto no cwd;
- o projeto é registrado no índice global;
- comandos de projeto funcionam em subdiretórios via walk-up;
- tasks são persistidas exclusivamente como `.md`;
- IDs são incrementais, legíveis e nunca reutilizados;
- `next_task_id` recupera colisões sem retroceder;
- CLI consegue criar, consultar, editar, mover e apagar tasks;
- CLI consegue manipular todos e comentários;
- CLI consegue gerenciar statuses definidos no escopo;
- UI lista projetos registrados;
- UI permite inicializar um projeto por seleção de diretório;
- UI mostra board com colunas e tasks;
- drag and drop altera status e posição;
- UI permite editar tasks, todos e comentários;
- exclusão pede confirmação;
- alterações da UI e CLI operam sobre os mesmos arquivos;
- writes são atômicos;
- edições concorrentes são detectadas por hash;
- nenhuma edição concorrente é sobrescrita silenciosamente;
- alterações externas aparecem automaticamente na UI via watcher + SSE;
- alterações externas não destroem edição local ainda não salva;
- `.memorycard/` pode ser versionado normalmente pelo Git;
- não existe banco de dados ou dependência de backend remoto;
- existe `~/.memorycard/models/default.md` válido;
- modelos podem ser globais ou específicos de projeto;
- `New Model` começa com uma cópia do `default.md`;
- modelos inválidos não podem ser salvos pela UI nem usados para criar tasks;
- o projeto persiste seu modelo padrão em `config.json` através de `task_model`;
- criação de task respeita o modelo padrão selecionado sem alterar tasks existentes.

---

## 39. Condição de parada / Definition of Done

O agente implementador deve **parar de adicionar funcionalidades** quando:

1. todos os critérios de aceitação da seção anterior estiverem satisfeitos;
2. os fluxos críticos estiverem cobertos por testes;
3. todos os comandos definidos neste documento estiverem implementados;
4. todas as operações principais da UI estiverem funcionais;
5. CLI e UI utilizarem a mesma camada de domínio/persistência;
6. file watcher + SSE refletirem alterações externas;
7. concorrência por hash estiver validada por teste de conflito real;
8. escrita atômica estiver sendo usada nos arquivos persistidos;
9. a aplicação funcionar sem banco de dados, autenticação ou serviço remoto;
10. o sistema de modelos estiver funcional, incluindo `default.md`, validação, escopos global/local e seleção por projeto;
11. não houver funcionalidades adicionais fora do escopo implementadas como requisito implícito.

Após atingir essa condição, qualquer funcionalidade adicional deve ser tratada como **pós-MVP** e não deve ser implementada sem nova decisão explícita.

---

## 40. Fora do escopo do MVP

Não implementar:

- banco remoto;
- autenticação;
- contas;
- permissões;
- sincronização em tempo real entre computadores;
- notificações;
- métricas;
- sprints;
- story points;
- Gantt;
- integrações externas;
- MCP;
- cloud própria;
- histórico/auditoria próprio;
- commits Git automáticos;
- resolução automática de conflitos Git;
- resolução automática de Markdown manualmente quebrado;
- locks distribuídos;
- colaboração simultânea multiusuário em tempo real;
- Electron;
- funcionalidades de gestão de projeto que não estejam explicitamente descritas neste documento.

---

## 41. Restrições para o agente implementador

Durante implementação:

- não inventar novos comandos CLI;
- não adicionar campos persistentes sem necessidade explícita;
- não criar banco de dados para facilitar implementação;
- não substituir Markdown por formato proprietário;
- não criar sincronização remota;
- não alterar a semântica dos IDs;
- não reutilizar IDs apagados;
- não aceitar overwrite silencioso de arquivos alterados externamente;
- não criar regras diferentes entre CLI e UI;
- não criar comandos CLI para gerenciamento de modelos no MVP;
- não permitir modelo sem a estrutura mínima obrigatória;
- não apagar o `default.md` global pela UI;
- não expandir escopo apenas porque uma biblioteca torna isso simples.

Quando uma decisão necessária não estiver descrita neste documento e afetar comportamento externo, persistência ou compatibilidade, a implementação deve parar naquele ponto específico e solicitar decisão em vez de escolher arbitrariamente.

---

## 42. Resumo das decisões consolidadas

```text
MemoryCard = aplicativo/CLI global

Projeto = diretório local contendo .memorycard/

Descoberta de projeto = walk-up a partir do cwd

Dashboard global = registro de paths conhecidos

project.id = UUID interno e estável

Task ID = inteiro incremental por projeto

IDs = nunca reutilizados

next_task_id = high-water mark monotônico

Task = tasks/<id>.md

Fonte da verdade = Markdown

Persistência = atomic write

Concorrência = optimistic concurrency por hash

UI = salvamento explícito para formulários

Atualização visual = file watcher + SSE

Alteração externa sem edição local = atualização automática

Alteração externa durante edição local = preservar formulário + bloquear save conflitante

Histórico = Git

Modelos globais = ~/.memorycard/models/

Modelo base = ~/.memorycard/models/default.md

Modelos locais = .memorycard/models/

Modelo padrão do projeto = config.json -> task_model

Criação de modelo = UI clona default + valida estrutura antes de salvar

Banco = nenhum

MCP = fora do MVP
```

---

## 43. Resultado esperado

Ao final do MVP, um desenvolvedor deve conseguir executar:

```bash
memorycard init
memorycard create "Implementar login"
memorycard show 1
```

trabalhar na task com um coding agent, abrir:

```bash
memorycard
```

visualizar e editar a mesma task no board local, fechar a sessão do agente e, posteriormente, iniciar outra sessão dizendo:

```text
vamos continuar a task 1
```

O agente deve conseguir ler o estado persistido da task e continuar o trabalho sem depender da conversa anterior.
