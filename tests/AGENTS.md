# Regras e Decisões de Testes (tests/AGENTS.md)

Este documento define as diretrizes essenciais para criação e manutenção de testes no MemoryCard.

## 1. Isolamento Absoluto do Ambiente Global
- **Nunca polua o diretório real do usuário (`~/.memorycard`):** Testes jamais devem ler ou gravar no `projects.json` ou modelos globais reais da máquina.
- **Uso obrigatório de `MEMORYCARD_GLOBAL_DIR`:** A suíte de testes configura automaticamente `process.env.MEMORYCARD_GLOBAL_DIR` para uma pasta temporária descartável (isolada por processo/execução).

## 2. Gerenciamento de Arquivos Temporários
- Projetos criados para testes unitários, de integração ou e2e devem residir em `os.tmpdir()` com identificador único (`memorycard-test-...`).
- Sempre limpar os diretórios criados no hook `afterEach` ou `afterAll` com `{ recursive: true, force: true }`.

## 3. Registro e Desregistro de Projetos
- Ao testar `ProjectService.initProject()`, o registro global ocorre dentro do `MEMORYCARD_GLOBAL_DIR` de teste, sem vazar para o usuário.
- Novos testes para operações de relink, exclusão (`unregisterProjectFromGlobalRegistry`) e listagem global devem verificar atomicidade e estado limpo entre testes.
