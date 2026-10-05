# Convenções de Interface do Usuário (UI Conventions)

Este documento registra as convenções e padrões de interface e experiência do usuário (UI/UX) do **MemoryCard**.

Cada convenção possui um identificador sequencial único (`UI-XXX`) para facilitar o rastreamento em tarefas, commits e revisões.

---

## Índice de Convenções

| ID | Título | Escopo |
|---|---|---|
| [UI-001](#ui-001-padrão-estrutural-de-configurações-por-temas-e-opções-contextuais) | Padrão Estrutural de Configurações por Temas e Opções Contextuais | Modais e Painéis de Configuração |
| [UI-002](#ui-002-criação-de-novos-componentes-e-utilitários) | Criação de Novos Componentes e Utilitários | Componentes e Estilos Web |

---

## UI-001: Padrão Estrutural de Configurações por Temas e Opções Contextuais

### 1. Contexto e Motivação
Telas e diálogos de configurações frequentemente sofrem de sobrecarga cognitiva quando apresentam múltiplos blocos dispersos ou opções redundantes. Para manter a interface limpa, intuitiva e consistente, adotamos uma hierarquia padronizada baseada em **Temas**, **Configurações Unificadas** e **Descrições Contextuais Dinâmicas**.

### 2. Anatomia Estrutural
Toda interface de configuração deve seguir a seguinte hierarquia:

```
[Tema Maior (Escopo Geral do Dialog / Página)]
  │
  ├── [Tema X (Seção Temática - Título Maior em Destaque)]
  │     │
  │     ├── [Configuração de XY: Opção Z / Opção W] (Controle único de alternância)
  │     │
  │     └── [Descrição Contextual Dinâmica]
  │           ├── Texto explicativo sobre a intenção da opção selecionada
  │           └── [Controles Complementares Condicionais] (ex: inputs numéricos, atalhos)
  │
  └── (Novas configurações para o Tema X ou novos Temas Y, Z...)
```

### 3. Diretrizes de Aplicação
1. **Tema Maior:** Define o contexto macro da tela ou modal (ex: *Visibilidade*, *Modelos*, *Geral*).
2. **Tema Específico (Tema X):** Identificado por um título maior dentro do diálogo (ex: *Altura das colunas*), separando visualmente o domínio da configuração.
3. **Opção Única de Alternância:**
   - Evitar múltiplos blocos concorrentes para a mesma propriedade.
   - Fornecer um seletor claro com alternativas bem delimitadas (ex: `Padrão` vs `Personalizado`).
4. **Descrição Contextual Imediata:**
   - Logo abaixo da opção selecionada, exibir um texto descritivo conciso explicando exatamente o que aquela opção faz e qual a sua finalidade no sistema.
5. **Controles Condicionais:**
   - Parâmetros auxiliares (como quantidade de tarefas, limites numéricos ou chaves adicionais) devem aparecer contextualizados dentro do bloco de descrição da respectiva opção (ex: campo numérico exibido apenas quando a opção *Personalizado* estiver ativa).
6. **Extensibilidade:**
   - Novas configurações pertencentes ao mesmo tema devem ser empilhadas seguindo o mesmo padrão ("Configuração de ...: Opção A / Opção B" + descrição).
   - Novos temas devem utilizar o mesmo estilo de cabeçalho em destaque.

### 4. Exemplo de Referência no Projeto
- **Componente:** [visibility-modal.tsx](file:///C:/Users/artue/OneDrive/Documentos/GitHub/memorycard/src/web/components/visibility-modal.tsx)
- **Tema Maior:** Visibilidade
- **Tema:** Altura das colunas
- **Configuração:** Modo de exibição (`Padrão` | `Personalizado`)
- **Descrição Contextual:**
  - `Padrão`: "Calcula automaticamente a altura ideal para caber no monitor sem gerar scroll na página inteira. As tarefas restantes são acessadas com scroll interno."
  - `Personalizado`: "Exibe exatamente a quantidade de tarefas escolhida antes de ativar o scroll interno da coluna." acompanhado do campo de ajuste de tarefas visíveis (`tasksLimit`).

---

## UI-002: Criação de Novos Componentes e Utilitários

### 1. Contexto e Motivação
Garantir que novos componentes, páginas e utilitários criados na interface web mantenham a previsibilidade da compilação de estilos do Tailwind CSS e o isolamento de escopo no Next.js.

### 2. Diretrizes de Aplicação
1. **Cobertura de Estilos no Tailwind:** Ao criar novos diretórios ou páginas com estilização, certifique-se de que o padrão de arquivos esteja coberto pelo `content` em `src/web/tailwind.config.js` (e no espelho da raiz).
2. **Isolamento de Escopo:** Evite estilos locais que dependam de variáveis ou classes geradas fora do escopo do Next.js.

