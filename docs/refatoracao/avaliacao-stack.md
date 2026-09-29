# Avaliação de stack

Responde às perguntas 1, 2 e 3 da issue #2: a stack TypeScript + React + Node serve? Se não, o que cabe na infra? E a alternativa sem framework?

Versões e licenças conferidas em 29/09/2026 no registro npm (`npm view <pacote> version license`) e nos repositórios oficiais. Só entram candidatos com licença livre verificada; os que não passam estão marcados.

## Resumo

- **TypeScript**: sim, sem ressalva. O motor (~1,4 mil linhas) e a interface se beneficiam de tipos, e é o pré-requisito para testes e refatoração segura.
- **React**: sim, na casca da interface (menus, modos, diálogos, estado da aplicação) e na renderização da lista de blocos. Palco, editor e o arrastar e soltar são código imperativo embrulhado em componentes. Motor, runtime da tartaruga, modelo de programa e persistência ficam sem framework, o que mantém a troca barata se um dia a escolha mudar.
- **Node**: sim, para uma API mínima que substitui `save.php` e `listar.php`. O alvo deve ser **Node 24 LTS**, não 22: o Node 22 está em Maintenance desde 2025-10-21 e sai de suporte em 2027-04-30. O 24 é Active LTS até 2026-10-20 e Maintenance até 2028-04-30. Se o droplet ficar no 22 por enquanto, nada muda no código; só o `engines` do `package.json` deve aceitar `>=22`.
- **Alternativa sem framework**: viável e mais leve, mas o custo de manter a sincronia estado → DOM à mão é exatamente a origem da bagunça atual em `js/pinteo7.js`. Recomendo a opção 1 com React fino. Detalhes na seção 3.

## 1. Encaixe de cada peça atual

### 1.1 Motor Papert (`js/logo.js`, `js/parser.js`)

Diagnóstico:

- O interpretador é quase puro. Depende do DOM em dois pontos: `print` e `cleartext` escrevem em `textOutput.innerHTML` (`js/logo.js:147`, `js/logo.js:154`), e todo comando de tartaruga chama métodos do objeto injetado por `setTurtle` (`js/logo.js:8-10`; despacho em `Logo.prototype.eval`, `js/logo.js:493-654`).
- O parser (`js/parser.js`) não toca o DOM. Faz tokenização por regex (`js/parser.js:258-262`), parse por "grab" (número de argumentos fixo por comando, `js/parser.js:151-170`) e infixos por precedência (`js/parser.js:171-187`).
- Os comandos são em inglês (`forward`, `fw`, `rt`, `repeat`, `to`, `end`), com mensagens de erro em pt-BR (`js/logo.js:86`, `js/parser.js:52`). Não há aliases em português registrados em lugar nenhum (`grep addAlias js/pinteo7.js` não retorna nada). A frase "comandos LOGO em pt-BR" do `CLAUDE.md` está imprecisa e precisa de correção.
- Não há AST separado: o parser devolve `Token`s com `args` aninhados e o interpretador avalia direto (`js/logo.js:493-654`). Serve como AST informal.
- Bugs latentes, úteis como testes de caracterização: `bitxor` usa `|` (`js/logo.js:230`), `last` devolve `b[b.length]`, que é `undefined` (`js/logo.js:199`), e o alias de `lessequal?` está registrado como `greaterequalp` (`js/logo.js:259`).

Opções:

| Opção | Prós | Contras |
|---|---|---|
| **Portar para TypeScript** (recomendado) | Preserva o comportamento, as mensagens em pt-BR e os nomes de comando. Código pequeno. Fica puro ao injetar duas interfaces (`TurtleCommands` e `TextOutput`). | Trabalho manual de ~1,4 mil linhas, mas mecânico. |
| Embrulhar o JS atual com tipos (`.d.ts`) | Menor esforço imediato. | Não resolve o acoplamento nem a qualidade; os globais continuam. |
| Trocar por jslogo (Joshua Bell, Apache-2.0, <https://github.com/inexorabletash/jslogo>) | Implementação moderna e completa de UCBLogo. | Semântica e conjunto de comandos diferentes; mensagens de erro em inglês; quebraria os programas compartilhados. Vai contra a prioridade de preservar o comportamento. Serve como referência para casos de borda do tokenizador. |

### 1.2 Tartaruga e palco (`js/turtle.js`, `js/init.js`)

Diagnóstico:

- `Turtle` mistura estado (x, y, ângulo, caneta), desenho em canvas 2D (`js/turtle.js:186-206`) e posicionamento do sprite via DOM e jQuery (`js/turtle.js:91-100`, `js/turtle.js:214`, `js/turtle.js:222`, `js/turtle.js:264`).
- `DelayTurtle` já é um pipeline de comandos adiados (`js/turtle.js:290-337`): cada chamada vira um `DelayCommand` e `paint()` consome a fila com `setTimeout` por `speed`. Com `drawbits`, `forward 100` vira 100 comandos de 1 px (`js/turtle.js:341-353`). É um padrão Command embrionário; a arquitetura proposta formaliza isso.
- Undo e redo existem como esqueleto comentado (`js/turtle.js:32-53`).
- O canvas tem 500×500 fixos (`js/init.js:28-32`, `js/init.js:108`) e `home` é o centro (`js/turtle.js:274-278`).

Canvas, SVG ou os dois:

| Camada | Recomendação | Motivo |
|---|---|---|
| Traço do desenho | **Canvas 2D** | Milhares de segmentos por programa; canvas é barato e é o que já existe. |
| Sprite do personagem | **Elemento HTML (`<img>`) com `transform`** em uma camada sobre o canvas | É o que o app já faz (`js/turtle.js:93-95`); permite transição CSS suave e troca de personagem sem redesenhar. |
| Exportar, redimensionar, undo | **Log de operações de desenho** (lista de segmentos e arcos) que permite redesenhar em qualquer tamanho, exportar para PNG (canvas) ou SVG (serializando o log) e implementar undo de verdade | Substitui o `getImageData` comentado em `js/turtle.js:42`. |

SVG puro para o traço foi descartado: programas com `repeat 360 [...]` e `drawbits` gerariam dezenas de milhares de nós.

### 1.3 Sistema de blocos

Diagnóstico (detalhado em `inventario-atual.md`):

- Os blocos são `<li>` em listas `<ol>` aninhadas, com campos `contenteditable` e atributos `data-code`, `data-what`, `data-value`. O arquivo `.cp7` compartilhado é o `innerHTML` dessa lista (exemplo em `compartilhados-code/NomeDoAluno-02-07-2015-1435796325.cp7`).
- A "tradução" blocos → LOGO percorre o DOM e monta o texto a partir dos `data-*`.
- Arrastar e soltar é jQuery UI draggable/droppable/sortable, com Touch Punch para toque.

Candidatos:

| Candidato | Versão | Licença | Encaixe |
|---|---|---|---|
| **Blocos próprios em HTML + `@atlaskit/pragmatic-drag-and-drop`** (recomendado) | 4.0.0 | Apache-2.0 | O modelo atual (lista aninhada, campos editáveis, um bloco por comando LOGO) já é uma árvore simples. Um modelo de dados tipado + render em HTML preserva a aparência, a acessibilidade (campos de texto reais) e a compatibilidade com `.cp7` via importador. Pragmatic DnD é leve, usa Pointer Events (toque nativo) e é mantido pela Atlassian. <https://github.com/atlassian/pragmatic-drag-and-drop> |
| Blockly | 13.3.0 | Apache-2.0 | Maduro, tem pt-br e toque, hoje mantido pela Raspberry Pi Foundation. Porém substitui o modelo e o visual inteiros por um workspace SVG próprio, gera código só em uma direção (blocos → texto) e tornaria o import de `.cp7` e a sincronia com o editor de texto mais difíceis. Fica como alternativa se o projeto quiser virar um "Scratch de LOGO". <https://github.com/google/blockly> |
| Scratch Blocks | fork do Blockly | Apache-2.0 | Referência visual para crianças; mesmas objeções do Blockly, com menos manutenção. |
| `@dnd-kit/core` | 6.3.1 | MIT | Sem release há cerca de dois anos e documentação arquivada em 2026. Descartado por risco de manutenção. |
| interact.js | 1.10.28 | MIT | Funciona, mas é mais genérico e menos ativo que o Pragmatic. |
| SVG para os blocos | — | — | SVG cabe em conectores e decoração, não nos blocos em si: campos de entrada, foco de teclado e leitores de tela funcionam melhor com HTML. Ver `layout-ux.md`. |

### 1.4 Editor

Diagnóstico: CodeMirror 5.3.0 via cdnjs (`index.html:16-21`), com modo LOGO próprio de 145 linhas em `cm/logo.js` que é só um lexer por estados (`cm/logo.js:2`, `cm/logo.js:7`).

| Candidato | Versão | Licença | Encaixe |
|---|---|---|---|
| **CodeMirror 6** (recomendado): `codemirror` 6.0.2 (pacote agregador), `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.13, `@codemirror/language` 6.12.4, `@codemirror/autocomplete` 6.20.3, `@codemirror/commands` 6.11.1 | ver ao lado | MIT | `StreamLanguage.define()` de `@codemirror/language` aceita um parser no estilo CM5, então `cm/logo.js` porta quase sem mudança. Uma gramática Lezer (`@lezer/generator` 1.8.1, MIT) fica como passo opcional para autocompletar e erros inline. Sai do CDN e entra no bundle. <https://github.com/codemirror/dev> |
| Monaco Editor | 0.57.0 | MIT | Vários MB e web workers; desproporcional para um editor de dez linhas de LOGO. Descartado. |
| `<textarea>` puro | — | — | Perde destaque de sintaxe e fechamento de colchetes, que ajudam crianças. Descartado. |

### 1.5 Animações

Diagnóstico: cerca de sessenta chamadas a `animate`, `fadeIn`, `slideDown`, `effect` e afins em `js/pinteo7.js`, mais diálogos com efeitos `shake` e `explode` em `js/init.js:77-86`.

| Candidato | Versão | Licença | Encaixe |
|---|---|---|---|
| **CSS transitions e Web Animations API** (recomendado como padrão) | nativo | — | Cobre fades, slides, rotação do sprite e a maior parte do que o jQuery faz hoje. `prefers-reduced-motion` é uma media query. |
| **Motion** (`motion`, ex-Framer Motion), para animações de layout, spring e listas reordenadas | 13.4.4 | MIT | Integra com React, respeita `prefers-reduced-motion` por configuração. Usar só onde CSS não chega (por exemplo, o bloco "voando" ao ser solto). <https://github.com/motiondivision/motion> |
| anime.js | 4.5.0 | MIT | Alternativa sem React. |
| GSAP | 3.15.0 | "Standard No-Charge License" | Gratuito desde 2025, mas a licença é proprietária e não é aprovada pela OSI. **Não atende à regra de licença livre verificada. Descartado.** <https://gsap.com/standard-license> |

### 1.6 Salvamento e compartilhamento

Diagnóstico: `save.php` grava PNG em base64 mais o código `.txt` e os blocos `.cp7` com nome vindo do cliente, sem validação; `listar.php` lista a pasta. Detalhes e problemas em `inventario-atual.md`.

| Candidato | Versão | Licença | Encaixe |
|---|---|---|---|
| **Hono + `@hono/node-server`** (recomendado) | 4.13.10 / 2.1.1 | MIT | Pequeno, TypeScript de ponta a ponta, usa a API `Request`/`Response` padrão. Para dois endpoints é suficiente. <https://github.com/honojs/hono> |
| Fastify | 5.12.5 | MIT | Mais completo (schemas, plugins). Boa escolha se a API crescer. |
| Express 5 | 5.2.1 | MIT | Funciona, mas sem vantagem sobre os dois acima em TypeScript. |
| **Zod** para validar o corpo das requisições | 4.6.5 | MIT | Limites de tamanho do PNG, formato do código, nome gerado no servidor. |
| Armazenamento | — | — | Manter arquivos em disco na primeira versão (paridade com hoje), com nomes gerados por ID e não pelo cliente. Se precisar de índice ou busca, `better-sqlite3` 13.0.3 (MIT). O módulo `node:sqlite` ainda é experimental no Node 22 e candidato a estável no 24; evitar por enquanto. |
| Caddy | 2.11.x | Apache-2.0 | Já serve os estáticos; `reverse_proxy /api/* localhost:3000` e `redir` 301 do caminho antigo resolvem o roteamento. |

### 1.7 Ferramental

| Função | Recomendação | Versão | Licença |
|---|---|---|---|
| Linguagem | TypeScript | 7.0.2 (se algum plugin ainda não suportar o TS 7, que é a reescrita nativa, fixar a última 6.x) | Apache-2.0 |
| Build e dev server | Vite | 8.3.1 | MIT |
| Testes unitários | Vitest | 5.0.2 | MIT |
| Testes de navegador | Playwright | 1.63.0 | Apache-2.0 |
| Lint e formatação | Biome (um só binário, sem conflito ESLint × Prettier) | 2.5.14 | MIT OR Apache-2.0 |
| Gerenciador de pacotes | pnpm | 12.6.0 | MIT |
| Estado da interface | Zustand (uma store pequena) ou `useReducer`; ver `arquitetura-proposta.md` | 5.0.15 | MIT |
| Ícones | Lucide (SVG inline, sem gerar subconjunto de fonte) | `lucide-react` 1.48.0 | ISC |
| Fonte | Nunito (manter) | Google Fonts | OFL 1.1 |

## 2. Tabela de substituições

| Atual | Onde | Candidatos | Recomendação | Licença do recomendado |
|---|---|---|---|---|
| jQuery 1.9.1 | `index.html:37` | DOM nativo, React | DOM nativo no motor e no palco; React na casca | MIT |
| jQuery UI 1.10.4 draggable/droppable/sortable | `index.html:38`, ~170 usos em `js/pinteo7.js` | Blockly, pragmatic-drag-and-drop, dnd-kit, interact.js | Blocos próprios em HTML + pragmatic-drag-and-drop 4.0.0 | Apache-2.0 |
| jQuery UI dialog, effects | `js/init.js:65-87` | `<dialog>` nativo, CSS | `<dialog>` + CSS transitions | nativo |
| jQuery UI Touch Punch | `index.html:40` | Pointer Events | Remover | — |
| CodeMirror 5.3.0 (CDN) + `cm/logo.js` | `index.html:16-25` | CodeMirror 6, Monaco | CodeMirror 6 com `StreamLanguage` | MIT |
| fancyBox 2.1.5 | `index.html:41` | `<dialog>`, PhotoSwipe 5.4.4 | `<dialog>`; PhotoSwipe (MIT) só se a galeria de compartilhados precisar de lightbox | MIT |
| bxSlider 4.x | `index.html:42` | CSS `scroll-snap` | CSS `scroll-snap`, sem biblioteca | — |
| Intro.js 1.0.0 (cópia local MIT em `js/intro.js`, não carregada) | `js/intro.js:1-7` | Driver.js 1.8.0, Shepherd.js | Driver.js. A cópia local é MIT, mas está parada em 2013; a versão atual do Intro.js (8.6.0) é AGPL-3.0 e o Shepherd.js (15.3.0) também; ambos descartados | MIT |
| Playr | `index.html:44` | `<video>` nativo | `<video controls>` com `<track>` para `legendas/pt-br.vtt` | nativo |
| highlight.js + 48 temas em `styles/` | comentado em `index.html:50-51` | — | Remover; não é carregado | — |
| prefixfree | `index.html:36` | — | Remover; repositório arquivado e prefixos desnecessários | — |
| Fonte de ícones `fonts/icomoon.*` | `css/icomoon.css` | Lucide, Phosphor | Lucide 1.48.0 (ISC); Phosphor 2.1.10 (MIT) é equivalente | ISC |
| `save.php`, `listar.php` | raiz | Hono, Fastify, Express | Hono 4.13.10 + Zod 4.6.5, Node 24 LTS | MIT |
| `getCidades.php` e cadastro | `welcome.html`, `js/welcome.js` | — | Decidir: remover o cadastro ou reduzir a um nome local. Ver `plano-migracao.md`, etapa 10 | — |
| Sem build | — | Vite | Vite 8.3.1 | MIT |
| Sem testes | — | Vitest, Playwright | Vitest 5.0.2 e Playwright 1.63.0 | MIT / Apache-2.0 |

## 3. Alternativa sem framework: comparação honesta

Opção 3: manter HTML e JS, modernizar com ES modules, classes, TypeScript opcional, Vite como build leve, e remover o jQuery aos poucos.

| Critério | Opção 1: TS + React + Node | Opção 3: TS + DOM, sem framework |
|---|---|---|
| Esforço inicial | Maior: aprender ou revisar React 19, configurar Vite com React, converter a casca | Menor: Vite + TS bastam; o HTML atual pode ser mantido por mais tempo |
| Esforço no sistema de blocos | Médio: lista de blocos como estado, render declarativo, DnD com Pragmatic | Alto: é preciso escrever a sincronia modelo → DOM à mão, que é exatamente o que `js/pinteo7.js` faz hoje com jQuery |
| Risco de regressão | Médio, concentrado na troca da casca | Baixo por etapa, porque cada função pode ser trocada in loco |
| Qualidade final | Alta: estado explícito, componentes testáveis, fronteira clara com o domínio | Depende da disciplina: sem framework, a tentação de espalhar estado no DOM volta |
| Manutenção por outra pessoa | Fácil de achar quem conheça React; padrões conhecidos | Precisa de documentação própria dos padrões de componente |
| Curva de aprendizado | React e hooks | Só TypeScript e DOM |
| Tamanho do bundle | React + ReactDOM cerca de 45 kB gzip; Preact 10.29.8 (MIT) reduz a cerca de 4 kB com a mesma API se isso importar | Mínimo |
| Reversibilidade | Motor, runtime da tartaruga, palco, editor, modelo de programa e arrastar e soltar ficam sem framework; a casca e a renderização da lista de blocos dependem de React | Total |

Veredito: a opção 3 seria a escolha se o app fosse só o palco e o editor. O que pesa a favor da opção 1 é o sistema de blocos e os modos aluno/professor: são interface com bastante estado, e um render declarativo evita reconstruir a bagunça atual. A recomendação é a opção 1 com React confinado à casca, e a opção 2 (outra stack) fica desnecessária, porque a opção 1 cabe na infra: Caddy serve o `dist/` do Vite e faz proxy para o Node.

Variantes da opção 1 consideradas e descartadas:

- **Preact** em vez de React: compatível, menor, mas a economia de 40 kB não compensa perder a compatibilidade direta com Motion e o ecossistema React 19. Fica como plano B trivial via alias do Vite.
- **Svelte 5, Solid, Lit**: bons, mas não há vantagem que justifique sair da direção já definida no `CLAUDE.md`.

## 4. Alertas de licença

| Biblioteca | Situação | Ação |
|---|---|---|
| fancyBox 2.1.5 (em uso) | CC BY-NC 3.0, uso não comercial | Remover na etapa da casca |
| Intro.js | A cópia local (1.0.0) é MIT (`js/intro.js:4`); a versão atual (8.6.0) é AGPL-3.0 | Não atualizar; trocar por Driver.js |
| GSAP (candidato) | Licença proprietária sem custo | Não adotar |
| Shepherd.js (candidato) | AGPL-3.0 | Não adotar |
| `@dnd-kit/core` (candidato) | MIT, mas manutenção parada | Não adotar |
| WebHostingHub Glyphs (em uso) | OFL segundo o `CLAUDE.md`; não há arquivo de licença em `fonts/` | Guardar uma cópia da licença original no repo ou migrar para Lucide, o que dispensa a fonte |
