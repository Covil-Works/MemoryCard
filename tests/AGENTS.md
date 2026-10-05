# Regras e Decisões de Testes (tests/AGENTS.md)

Este documento define as diretrizes essenciais para criação e manutenção de testes no MemoryCard.

## 1. Proibição de Alteração de Testes Existentes
- **Proibido alterar testes existentes:** Ao criar ou editar funcionalidades no código da aplicação, **NÃO** altere os testes existentes. Eles servem para validar e garantir o comportamento esperado do que estamos desenvolvendo (o código deve se adequar aos testes, e nunca o inverso).

## 2. Criação Sob Demanda e Solicitação Explícita de Testes
- **Novos testes não devem ser criados sem solicitação:** Não crie arquivos ou suítes de testes "do nada" por iniciativa própria durante a resolução de tarefas de código.
- **Elaboração metódica e consciente:** Testes devem ser desenvolvidos com calma e atenção dedicada. O agente de IA pode ativamente sugerir a criação de testes quando avaliar necessário, mas **só deve criá-los** se o usuário solicitar explicitamente ou aceitar expressamente a sua sugestão.

## 3. Isolamento Absoluto do Ambiente Global
- **Nunca polua o diretório real do usuário (`~/.memorycard`):** Testes jamais devem ler ou gravar no `projects.json` ou modelos globais reais da máquina.
- **Uso obrigatório de `MEMORYCARD_GLOBAL_DIR`:** A suíte de testes configura automaticamente `process.env.MEMORYCARD_GLOBAL_DIR` para uma pasta temporária descartável (isolada por processo/execução).

## 4. Gerenciamento de Arquivos Temporários
- Projetos criados para testes unitários, de integração ou e2e devem residir em `os.tmpdir()` com identificador único (`memorycard-test-...`).
- Sempre limpar os diretórios criados no hook `afterEach` ou `afterAll` com `{ recursive: true, force: true }`.

## 5. Registro e Desregistro de Projetos
- Ao testar `ProjectService.initProject()`, o registro global ocorre dentro do `MEMORYCARD_GLOBAL_DIR` de teste, sem vazar para o usuário.
- Novos testes para operações de relink, exclusão (`unregisterProjectFromGlobalRegistry`) e listagem global devem verificar atomicidade e estado limpo entre testes.
