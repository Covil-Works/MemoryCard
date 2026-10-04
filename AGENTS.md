# Orientações para Agentes de IA (AGENTS.md)

Este repositório contém o código do **MemoryCard**, uma plataforma para gerenciamento de memória e estados de tasks em projetos de software.

## Regras de Testes
As diretrizes e decisões arquiteturais sobre testes automatizados estão descritas em [tests/AGENTS.md](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/tests/AGENTS.md).
- Todo teste deve respeitar o isolamento absoluto de diretórios e variáveis globais.
- Jamais execute testes que possam gravar no diretório de usuário real (`~/.memorycard`).

## Princípios de Desenvolvimento
1. **Integridade de Armazenamento:** Modificações em arquivos de configuração e tasks utilizam escrita atômica (`atomicWriteFile`) e validação de concorrência com base em hash SHA-256 (`If-Match`).
2. **Separação Local vs Global:** Projetos individuais mantêm suas configurações e tasks em `.memorycard/` no diretório raiz do projeto; o diretório global (`MEMORYCARD_GLOBAL_DIR` ou `~/.memorycard/`) gerencia apenas o índice de projetos (`projects.json`) e modelos globais.
3. **Não Poluição de Ambiente:** Qualquer script, CLI ou teste executado em ambiente de desenvolvimento deve preservar a integridade do sistema operacional e limpar recursos temporários.
