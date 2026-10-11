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
| [UI-005](#ui-005-suporte-a-temas-visuais-default-play-e-ps1) | Suporte a Temas Visuais (Default, Play e PS1) | Geral (Design System & Temas) |
| [UI-006](#ui-006-reordenação-personalizada-e-persistente-de-colunas-do-kanban) | Reordenação Personalizada e Persistente de Colunas do Kanban | Quadro Kanban & Preferências do Usuário |

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
- **Componente:** [visibility-modal.tsx](../../src/web/components/visibility-modal.tsx)
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

## UI-005: Suporte a Temas Visuais (Default, Play e PS1)

### 1. Contexto e Motivação
A aplicação suporta múltiplos temas visuais preservando integralmente a estrutura de navegação, disposição de elementos e layout. Essa convenção estabelece as regras para o tema original `default`, o tema `play` e o tema claro `ps1`.

### 2. Diretrizes do Tema `default`
1. **Preservação Integral:** O tema `default` representa o visual clássico e técnico do MemoryCard (fundo preto `#000000`, botões neutros e preto/branco de alto contraste, cantos rígidos e contêineres delimitados).
2. **Imutabilidade Visual:** Nenhuma alteração de cores, bordas ou comportamentos visuais deve afetar o tema `default`.

### 3. Diretrizes do Tema `play`
1. **Hierarquia de Fundo e Contêineres:**
   - **Fundo Principal:** Adota a tonalidade cinza escuro `#242424` (`background mais escuro`).
   - **Cabeçalho e Contêineres:** O cabeçalho (`AppHeader`) e o container de projetos na Home utilizam a tonalidade cinza `#2C2C2C`. No container principal de projetos (`.home-projects-box`), a sombra e a borda externa são completamente removidas (sem borda de `1px`), mantendo apenas o bloco na cor de fundo `#2C2C2C` e a linha divisória inferior abaixo do título "Projetos registrados" (`.home-projects-header`).
   - **Elementos e Cards Internos Mais Claros:** Os cards de projeto na Home (`#383838`) e os cards de tarefas no Kanban (`#383838`, hover `#424242`) possuem tonalidade mais clara para garantir contraste nítido em relação ao fundo e aos contêineres.
   - **Colunas do Board:** Não são mais escuras que o background; utilizam a tonalidade cinza `#2C2C2C`, mantendo a coerência visual entre containers.
   - **Controle de Ordenação:** Substitui o seletor visível e texto "Ordenar" por um botão contendo exclusivamente o ícone de ordenação (`ArrowUpDown`), estilizado no padrão visual de botões do tema com a cor associada ao `X / Cruz` (`#2e6db4` / `.btn-action-blue`). Ao clicar, abre o menu dropdown com as opções disponíveis (`Manual`, `Mais Recente`, `Alfabética`), indicando a ordenação atualmente selecionada com checkmark e destaque visual. A ordenação padrão é `Manual`.
2. **Paleta de Cores Inspirada nos Símbolos dos Controles:**
   - **Triângulo / Verde (`#46b48a`):** Ações de criação e avanço (`+ Novo Projeto`, `+ Nova Coluna`, `+ Novo Modelo`, `Criar Task`, `+ Todo`).
   - **X / Cruz / Azul (`#2e6db4`):** Salvar configurações e estados ativos de alternância/toggles.
   - **Círculo / Vermelho (`#df0024`):** Ações destrutivas, perigo e exclusão (ícone de lixeira / remoção de projeto, `Excluir Coluna`, `Excluir Task`).
   - **Quadrado / Rosa (`#f69dc8`):** Ações primárias de abertura de quadro (`Abrir Board`), adição de tarefas nas colunas (`+ Task`), relink (`Relincar Pasta`), atalhos numéricos contextuais (`[3, 5, 7, 10]`) e ajustes secundários.
3. **Regras de Botões Coloridos:**
   - **Estado Normal:** Fundo transparente, borda de `2px` na respectiva cor do botão, e texto/ícones renderizados na mesma cor.
   - **Hover:** O fundo do botão é preenchido com a respectiva cor do botão, a borda mantém a mesma cor, e o texto, ícones vetoriais e conteúdo interno tornam-se inteiramente brancos (`#ffffff`).
   - **Abrangência Universal:** Válido para todos os botões coloridos do tema, inclusive em diálogos e modais.
   - **Cantos Suaves Padronizados (4px):** Todos os elementos, caixas, modais e botões possuem acabamento com cantos arredondados de `4px` (`border-radius: 4px`).
   - **Ícone de Lixeira:** A remoção de projeto da lista é representada por um ícone de lixeira vetorial (`Trash2`) em vermelho.
4. **Preservação Visual de Dialogs e Modais:**
   - Diálogos e modais preservam integralmente seus backgrounds, superfícies (`#242424`), contêineres e campos de entrada originais, aplicando apenas a regra de hover nos botões.
5. **Memory Card 3D:**
   - **Iluminação Calibrada:** Reutiliza a configuração e calibração visual do tema `default` (mesmo ângulo de iluminação, mapa de tons sRGB e realce dos relevos e detalhes da carcaça plástica).
   - **Sticker Outline:** Contorno branco contínuo de aproximadamente `4px` ao redor da silhueta 2D renderizado nativamente na GPU via pós-processamento.
   - **Velocidades de Rotação e Hover:** Ao passar o mouse (`hover`) sobre o objeto 3D, a rotação desacelera suavemente para um ritmo mais lento que a velocidade original em ambos os temas (`default` e `play`).
   - **Interação Física ao Pressionar:** Ao pressionar (`pointerdown`) no tema `play`, o card diminui levemente de tamanho e acelera sua rotação gradativamente enquanto vibra/treme (shake cumulativo após 220ms). Ao soltar (`pointerup`), a tremida para imediatamente, a rotação desacelera suavemente de volta ao ritmo de hover, o card aumenta rapidamente além do tamanho normal (overshoot) e retorna suavemente ao tamanho original. Cliques sucessivos tratam a transição suavemente sem interrupção abrupta.
   - **Emissão de Letras como Partículas:** Ao soltar o card (tanto em clique rápido quanto segurado), letras soltas surgem de trás da silhueta do card em direções radiais aleatórias, desacelerando suavemente por atrito e desaparecendo em fade out gradual.
     - **Conjunto de Caracteres Restrito:** Apenas letras contidas nas palavras `Memory Card` e `Covil`.
     - **Tipografia:** Fonte retrô `MinimalHard` (`ref/`).
     - **Cores:** Reutiliza exclusivamente as variáveis do tema Play (`--play-green`, `--play-pink`, `--play-red`, `--play-blue`).
     - **Intensidade e Alcance Proporcionais:** A quantidade (16 a 54) e o alcance das partículas aumentam progressivamente com o tempo em que o card é segurado. No clique rápido, as letras ficam contidas em raio menor próximo ao card; em seguradas mais longas, ganham maior velocidade e viajam até as extremidades da tela (para cima, baixo, esquerda e direita) em canvas de tela cheia antes de desaparecerem por fade out.
6. **Efeito Visual de Ruído / Granulado Animado:**
   - Textura orgânica de pequenos pontos/grãos de foto/vídeo antigo renderizada dinamicamente via canvas dedicado ([`PlayNoiseOverlay`](../../src/web/components/play-noise-overlay.tsx)) em camada de sobreposição fixa (`fixed inset-0 pointer-events-none z-[99999] opacity-[0.45]`), ativa exclusivamente no tema `play`.
   - Os pontos operam em escala microscópica (sub-pixel) e mudam suavemente de posição a 12 fps através da alternância de quadros procedurais e deslocamento espacial aleatório, gerando a cadência natural e repousante de película analógica (Super 8/16mm).
   - Proibição estrita de listras, scanlines, faixas VHS ou distorções de TV analógica — apenas granulado fino em pontos de luz e sombra com 70% de área transparente preservada.
   - Pausa automática em abas inativas (`visibilitychange`) e respeita preferências de acessibilidade (`prefers-reduced-motion`).

### 4. Diretrizes do Tema `ps1` (Tema Claro Retrô)
1. **Identidade Visual e Carcaça:**
   - **Inspiração:** Console PlayStation original (1994) e seus cartões de memória originais de alta durabilidade.
   - **Tons Plásticos Cinza-Claro:** Fundo principal em cinza-claro característico (`#dcdce0`), cabeçalho superior em cinza industrial fosco (`#cfd0d5`) e superfícies de contêineres/colunas em cinza suave (`#ebebef`).
   - **Superfícies Nítidas e Cards em Branco:** Cards de tarefas no Kanban e cards de projeto na Home utilizam fundo branco puro (`#ffffff`) com bordas refinadas (`#c4c5cc`), destacando os cards com nitidez sobre as colunas e contêineres.
2. **Tipografia de Alto Contraste:**
   - Textos primários e títulos adotam preto/grafite profundo (`#18181b`), garantindo contraste acessível (WCAG AAA) sobre as bases claras de cinza e branco.
   - Textos secundários utilizam cinza neutro escuro (`#52525b`) e legendas técnicas em `#71717a`.
3. **Botões e Detalhes Discretos:**
   - **Botão Primário:** Inspirado nos botões redondos em relevo e soquetes escuros do console, adota acabamento em grafite profundo (`#23252a`, hover `#383a42`) com tipografia branca de alto impacto.
   - **Ações com Acentos Sutis:**
     - Criação e adição: tom menta suave (`#ecfdf5`, borda `#10b981`, texto `#047857`, hover verde sólido `#059669` com texto branco).
     - Salvar e alternâncias: azul PlayStation sutil (`#eff6ff`, borda `#3b82f6`, texto `#1d4ed8`, hover azul sólido `#2563eb` com texto branco).
     - Abrir board e atalhos: rosa/framboesa sutil (`#fdf2f8`, borda `#ec4899`, texto `#be185d`, hover `#db2777` com texto branco).
     - Exclusão e perigo: carmesim suave (`#fef2f2`, borda `#ef4444`, texto `#b91c1c`, hover `#dc2626` com texto branco).
   - **Cantos Padronizados:** Acabamento suave de 4px (`border-radius: 4px`) em botões, caixas, modais e cards.
4. **Modais e Superfícies Flutuantes:**
   - Superfície em cinza suave (`#f5f5f8`) com cabeçalho e rodapé delimitados em `#e6e7ec` e divisórias em `#c8c9d0`.
   - Campos editáveis (`input`, `textarea`, `select`) com fundo branco (`#ffffff`), texto escuro (`#18181b`) e foco destacado em `#23252a`.

### 5. Alternância e Persistência
1. O tema é configurável via `VisibilityModal` (seguindo a hierarquia de `UI-001`) e atalho rápido no menu superior direito do `AppHeader`.
2. O tema ativo é persistido no `localStorage` sob a chave `memorycard_theme` e refletido no DOM pelo atributo `data-theme="default"`, `data-theme="play"` ou `data-theme="ps1"`.

---

## UI-006: Reordenação Personalizada e Persistente de Colunas do Kanban

### 1. Contexto e Motivação
Diferentes fluxos de desenvolvimento e desenvolvedores podem preferir organizar a visão horizontal do Kanban de maneiras distintas (por exemplo, mover a coluna `In Progress` para a primeira posição ou reorganizar colunas de validação e release). A interface deve permitir a reorganização livre das colunas preservando a integridade das tarefas, a compatibilidade entre múltiplos temas e o isolamento entre preferências pessoais do usuário e a configuração compartilhada no repositório.

### 2. Princípios de Implementação
1. **Isolamento entre Movimento de Colunas e Tarefas:**
   - O drag-and-drop de colunas utiliza o tipo de dado dedicado `application/x-memorycard-column`, enquanto o arrasto de tarefas utiliza `application/x-memorycard-task` (e `text/plain` para compatibilidade).
   - O arrasto de cards de tarefa invoca `stopPropagation()` para evitar que o evento de drag borbulhe para a coluna.
   - O arrasto de colunas é iniciado a partir do cabeçalho da coluna (`.kanban-column-header`), contendo um ícone de arraste (`GripVertical`), enquanto botões de ação internos (`+ Task`, menu `...`) possuem `draggable={false}` e interrompem a propagação de clique/foco.
   - **Invariante Crítica:** Mover uma coluna **nunca** altera o status de nenhuma tarefa. Cada tarefa permanece estritamente vinculada ao seu `column.id` original.
2. **Acessibilidade e Usabilidade Mobile:**
   - Além do drag-and-drop por mouse/toque, cada coluna possui ações de reordenação direta em seu menu de opções (`...`):
     - *Mover para a esquerda* (`ArrowLeft`): move a coluna uma posição à esquerda (desabilitado na primeira coluna).
     - *Mover para a direita* (`ArrowRight`): move a coluna uma posição à direita (desabilitado na última coluna).
     - *Restaurar ordem original* (`RotateCcw`): restaura a ordenação padrão definida na configuração do projeto.
   - Quando uma ordem personalizada está ativa, um botão de restauração rápida (`RotateCcw`) é exibido também no cabeçalho do quadro.
3. **Persistência Desacoplada e Resiliente:**
   - A preferência de ordenação é armazenada no navegador via `localStorage` sob a chave `memorycard_column_order_${slug}` como um array JSON de strings com os IDs das colunas (ex: `["in-progress", "todo", "done"]`).
   - Se o usuário nunca reordenou as colunas, o valor é nulo e a ordem canônica do arquivo de configuração do projeto (`config.columns`) é mantida integralmente como padrão.
   - **Tratamento de Anomalias e Evolução do Projeto:**
     - Se o dado armazenado estiver corrompido, for inválido ou não for um array de strings não-vazias, o sistema descarta a preferência com segurança e renderiza a ordem padrão sem quebrar a interface.
     - Se novas colunas forem adicionadas ao projeto no arquivo de configuração, elas são preservadas e anexadas ao final da visualização.
     - Se colunas foram deletadas do projeto, IDs inexistentes no storage são descartados silenciosamente.
4. **Suporte Universal aos Temas (`default`, `play`, `ps1`):**
   - Os estados visuais de arrasto (`.column-dragging` com opacidade reduzida e `.column-drag-target` com borda tracejada e contorno) são estilizados com as paletas e contrastes de cada tema, respeitando a política No-Emoji (`UI-004`).
