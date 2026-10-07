# Convenções de Interface do Usuário (UI Conventions)

Este documento registra as convenções e padrões de interface e experiência do usuário (UI/UX) do **MemoryCard**.

Cada convenção possui um identificador sequencial único (`UI-XXX`) para facilitar o rastreamento em tarefas, commits e revisões.

---

## Índice de Convenções

| ID | Título | Escopo |
|---|---|---|
| [UI-001](#ui-001-padrão-estrutural-de-configurações-por-temas-e-opções-contextuais) | Padrão Estrutural de Configurações por Temas e Opções Contextuais | Modais e Painéis de Configuração |
| [UI-002](#ui-002-criação-de-novos-componentes-e-utilitários) | Criação de Novos Componentes e Utilitários | Componentes e Estilos Web |
| [UI-003](#ui-003-responsividade-mobile-e-quadro-kanban-com-rolagem-horizontal-isolada) | Responsividade Mobile e Quadro Kanban com Rolagem Horizontal Isolada | Layout Geral e Quadro Kanban |
| [UI-004](#ui-004-proibição-de-emojis-na-interface-do-usuário-no-emoji-policy) | Proibição de Emojis na Interface do Usuário (No-Emoji Policy) | Geral (UI & UX) |
| [UI-005](#ui-005-suporte-a-temas-visuais-default-e-play) | Suporte a Temas Visuais (Default e Play) | Geral (Design System & Temas) |

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

---

## UI-003: Responsividade Mobile e Quadro Kanban com Rolagem Horizontal Isolada

### 1. Contexto e Motivação
A aplicação deve ser plenamente acessível e visualmente agradável em celulares e dispositivos com telas estreitas. O layout global (cabeçalho, barra de ferramentas, lista de projetos e modais) deve se adequar estritamente à largura do dispositivo (`width: 100%`), sem permitir que a página inteira transborde ou sofra deslocamento horizontal indesejado.

No quadro Kanban, o fluxo de colunas não deve ser quebrado verticalmente; a disposição das colunas deve se manter lado a lado, permitindo que o usuário deslize horizontalmente apenas pelo trilho de colunas.

### 2. Diretrizes de Aplicação
1. **Contenção Global de Rolagem:** O `html`, o `body` e o contêiner raiz `<main>` devem ter `overflow-x: hidden` e `max-width: 100%`, impedindo qualquer efeito de rolagem lateral na página inteira.
2. **Isolamento de Rolagem das Colunas:** O contêiner de colunas deve possuir `overflow-x: auto`, `overscroll-x-contain` e classes de suavidade touch (`-webkit-overflow-scrolling: touch` via `.custom-scrollbar`).
3. **Largura das Colunas em Modo Mobile:** Em telas menores que `640px` (`sm:`), as colunas utilizam largura dinâmica de visualização parcial (`w-[82vw] max-w-[320px] sm:w-[290px]`) acompanhada de `snap-start` e `snap-x snap-proximity`. Isso exibe a coluna em foco e deixa a borda da próxima coluna visível à direita, sinalizando intuitivamente a capacidade de deslizamento.
4. **Modais Responsivos:** Todos os modais devem limitar sua altura com `max-h-[90vh] sm:max-h-[85vh]` e `my-auto`, permitindo rolagem interna no corpo do modal em telas pequenas.
5. **Prevenção de Auto-Zoom no iOS:** Todos os campos editáveis (`input`, `textarea`, `select`) devem possuir fonte mínima de `16px` em resoluções mobile (`@media (max-width: 640px)`), prevenindo que o WebKit execute auto-zoom na tela ao focar.

---

## UI-004: Proibição de Emojis na Interface do Usuário (No-Emoji Policy)

### 1. Contexto e Motivação
O **MemoryCard** adota uma identidade visual técnica, sóbria, monocromática e minimalista voltada a desenvolvedores e agentes de IA. O uso de emojis Unicode decorativos (ex.: 📱, 💡, ⚠️, ⚙, etc.) em rótulos, títulos, botões e modais compromete a consistência e a seriedade da aplicação, além de gerar renderizações visuais díspares e imprevisíveis entre diferentes plataformas (Android, iOS, Windows, macOS e distribuições Linux).

### 2. Diretrizes de Aplicação
1. **Tolerância Zero para Emojis em Textos de UI:** É terminantemente proibido o uso de emojis de texto Unicode em qualquer elemento visível da interface gráfica (incluindo cabeçalhos, botões, opções de menu, formulários, alertas e modais).
2. **Iconografia Profissional Vetorial:** Sempre que for estritamente necessária uma representação gráfica além do texto puro, deve-se empregar ícones vetoriais padronizados (SVGs limpos ou pacotes profissionais dedicados como `lucide-react`), respeitando a paleta e traço do design system.
3. **Indicadores de Status Textuais e Monospaçados:** Alertas, tags e badges de estado devem priorizar rótulos textuais claros (ex.: `[Aviso]`, `[INFO]`, `ERRO`) com estilização tipográfica monocromática e contraste semântico sutil via cores de borda/texto, sem depender de ilustrações cartunescas.
4. **Exibição Condicional de Controles Móveis:** Recursos voltados a conectar smartphones (como o botão e opção de menu "Acessar no Celular") devem ser exibidos unicamente no ambiente desktop (`hidden sm:inline-flex` / `hidden sm:block`), evitando poluir a interface quando o usuário já estiver operando a partir do próprio dispositivo móvel.

---

## UI-005: Suporte a Temas Visuais (Default e Play)

### 1. Contexto e Motivação
A aplicação suporta múltiplos temas visuais preservando integralmente a estrutura de navegação, disposição de elementos e layout. Essa convenção estabelece as regras para o tema original `default` e o tema `play`.

### 2. Diretrizes do Tema `default`
1. **Preservação Integral:** O tema `default` representa o visual clássico e técnico do MemoryCard (fundo preto `#000000`, botões neutros e preto/branco de alto contraste, cantos rígidos e contêineres delimitados).
2. **Imutabilidade Visual:** Nenhuma alteração de cores, bordas ou comportamentos visuais deve afetar o tema `default`.

### 3. Diretrizes do Tema `play`
1. **Fundo Principal:** Permanece preto (`#000000`).
2. **Paleta de Cores Inspirada nos Símbolos dos Controles:**
   - **Triângulo / Verde (`#46b48a`):** Ações de criação, adição e avanço (`+ Novo Projeto`, `+ Nova Coluna`, `+ Task`, `+ Novo Modelo`, `Criar Task`, `+ Todo`).
   - **X / Cruz / Azul (`#2e6db4`):** Ações primárias de abertura e navegação (`Abrir Board →`), salvar configurações e estados ativos de alternância/toggles.
   - **Círculo / Vermelho (`#df0024`):** Ações destrutivas, perigo e exclusão (`Remover`, `Excluir Coluna`, `Excluir Task`).
   - **Quadrado / Rosa (`#f69dc8`):** Ações de relink (`Relincar Pasta`), atalhos numéricos contextuais (`[3, 5, 7, 10]`) e ajustes secundários.
3. **Regras de Botões:**
   - **Proibição de Preenchimento Branco:** Nenhum botão deve ter preenchimento branco (`background: #ffffff`). O branco é reservado para textos, bordas, ícones e detalhes.
   - **Cantos Arredondados:** Botões possuem acabamento menos rígido e cantos mais suaves (`border-radius: 8px`).
4. **Cards e Contêineres Abertos:**
   - Grandes caixas e contêineres decorativos (como o card externo de projetos na Home) tornam-se transparentes (`background: transparent`, `border-color: transparent`, `box-shadow: none`), deixando a hierarquia visual a cargo dos próprios títulos, botões e itens internos.
5. **Preservação de Bordas Estruturais:**
   - Bordas que organizam o fluxo de colunas e divisões estruturais do layout (como separadores de cabeçalho e trilhos de colunas do Kanban) devem continuar existindo.
6. **Memory Card 3D com Sticker Outline:**
   - O objeto 3D do Memory Card na Home recebe um contorno branco contínuo de aproximadamente `4px` ao redor de sua silhueta 2D enquanto gira.
   - O contorno não deve ser uma geometria 3D no modelo; é aplicado como efeito/filtro 2D na projeção da tela sobre o canvas transparente, sem acompanhar individualmente faces internas ou profundidade do objeto.
7. **Alternância e Persistência:**
   - O tema é configurável via `VisibilityModal` (seguindo a hierarquia de `UI-001`) e atalho rápido no menu superior direito do `AppHeader`.
   - O tema ativo é persistido no `localStorage` sob a chave `memorycard_theme` e refletido no DOM pelo atributo `data-theme="play"` / `data-theme="default"`.


