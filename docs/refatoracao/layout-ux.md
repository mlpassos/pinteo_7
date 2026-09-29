# Layout e UX

Responde à pergunta 5 da issue #2. Público: crianças de 8 a 12 anos, em desktop de escola, notebook e tablet. Objetivo: tela cheia, blocos fáceis de manipular no toque, animação suave, acessível e com aparência que se possa mostrar a alguém.

## 1. Diagnóstico do layout atual

- Largura fixa de 1000 px com cabeçalho fixo de 100 px (`css/home.css:321-325`, `css/home.css:1127-1138`) e colunas por float com margem negativa (`css/papert.css:61-71`). Zero media queries. Em tablet o app corta ou exige zoom.
- O palco é de 500×500 px fixos (`index.html:440`), sem redimensionar.
- O menu tem sete categorias com submenus absolutos que abrem por clique (`css/home.css:1199-1208`), e os campos de valor do menu ficam escondidos (`css/home.css:1302-1306`), então a criança adiciona um bloco com "valor" e depois edita dentro do bloco.
- Os blocos usam `contenteditable` em `div` (`js/pinteo7.js:1572-1650`), sem rótulo acessível, e o arrastar depende de jQuery UI com Touch Punch.
- Nada respeita `prefers-reduced-motion`; há 11 `@keyframes` e efeitos `shake`/`explode` no diálogo de erro (`js/init.js:77-86`).
- O modo inicial é linha de comando ("CLI"), com `#codeblocks` escondido (`css/home.css:1111-1117`). Para o público-alvo, o modo blocos deveria ser o padrão.

## 2. Proposta de layout em tela cheia

Três regiões em desktop: paleta à esquerda, área de trabalho (blocos ou texto) no centro, palco à direita. Barra de ações embaixo da área de trabalho. Sem cabeçalho fixo alto: uma barra fina com o nome, o personagem e a ajuda.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pinte o 7   [🐢 personagem ▾]                          [? ajuda] [≡ menu] │
├──────────────┬───────────────────────────────┬───────────────────────────┤
│ PALETA       │ ÁREA DE TRABALHO              │ PALCO                     │
│              │  (Blocos) (Texto)  ← abas     │                           │
│ ▸ Movimento  │ ┌───────────────────────────┐ │   ┌───────────────────┐   │
│   frente 50  │ │ repetir [4] vezes         │ │   │                   │   │
│   trás   50  │ │ ┌───────────────────────┐ │ │   │        🐢         │   │
│   girar ↻ 90 │ │ │ frente [100]          │ │ │   │                   │   │
│   girar ↺ 90 │ │ │ girar ↻ [90]          │ │ │   │                   │   │
│ ▸ Caneta     │ │ └───────────────────────┘ │ │   └───────────────────┘   │
│ ▸ Controle   │ │ cor [■]                   │ │  saída de texto (print)   │
│ ▸ Dados      │ └───────────────────────────┘ │                           │
│ ▸ Operadores │ [▶ Rodar] [⏸] [■ Parar]       │ [💾 Baixar] [↗ Compartilhar]│
│ ▸ Procedim.  │ velocidade: ○ lenta ● normal  │ [🧹 Limpar]               │
│              │            ○ rápida           │                           │
└──────────────┴───────────────────────────────┴───────────────────────────┘
```

Grid CSS: `grid-template-columns: 240px minmax(320px, 1fr) minmax(360px, 45vw)`, `grid-template-rows: 48px 1fr`. O palco é quadrado e ocupa a maior lateral possível (`aspect-ratio: 1`, redesenhado do log de operações ao redimensionar).

### Tablet (768 a 1024 px, paisagem)

Paleta vira uma faixa de ícones à esquerda (72 px) que abre a categoria como painel sobreposto ao tocar. Palco e área de trabalho dividem o resto meio a meio.

```
┌──────────────────────────────────────────────────────┐
│ Pinte o 7  [🐢 ▾]                          [?] [≡]   │
├────┬───────────────────────┬─────────────────────────┤
│ ↔  │ (Blocos) (Texto)      │        PALCO            │
│ ✎  │ ┌───────────────────┐ │   ┌─────────────────┐   │
│ ⟳  │ │ blocos…           │ │   │      🐢         │   │
│ x  │ │                   │ │   │                 │   │
│ +  │ └───────────────────┘ │   └─────────────────┘   │
│ ƒ  │ [▶] [■]  vel ○●○      │ [💾] [↗] [🧹]           │
└────┴───────────────────────┴─────────────────────────┘
```

### Tablet retrato e celular (< 768 px)

Palco em cima (largura total, quadrado), abas "Blocos", "Texto" e "Paleta" embaixo, ações numa barra fixa inferior. Celular é suporte de leitura e execução, não de edição confortável, e isso é aceitável para o público.

```
┌──────────────────────┐
│ Pinte o 7  [🐢▾] [?] │
├──────────────────────┤
│       PALCO          │
│      ┌────────┐      │
│      │   🐢   │      │
│      └────────┘      │
├──────────────────────┤
│ (Paleta)(Blocos)(Txt)│
│ ┌──────────────────┐ │
│ │ repetir [4] vezes│ │
│ │  ┌─────────────┐ │ │
│ │  │ frente [100]│ │ │
│ └──────────────────┘ │
├──────────────────────┤
│ [▶ Rodar] [■] [🧹]   │
└──────────────────────┘
```

## 3. Interação com os blocos

### Modelo mental

- **Paleta → área de trabalho:** arrastar (ou tocar, que adiciona ao fim) um bloco da paleta. Hoje é só clique no menu (`js/pinteo7.js:1557`); arrastar é o esperado por quem já viu Scratch, e o toque continua funcionando.
- **Reordenar:** arrastar dentro da lista, com um espaço reservado (placeholder) que abre onde o bloco vai cair. Pragmatic DnD dá o evento; o placeholder é um elemento nosso.
- **Aninhar:** `repetir` e `defina` têm uma "boca" (`<ol>` interno) que aceita blocos; a borda da boca destaca quando um bloco está sobre ela.
- **Editar valores:** cada valor é um `<input type="number" inputmode="numeric">` ou um `<select>` de variáveis, e não um `contenteditable`. Teclado numérico no toque, rótulo acessível, seta para cima e para baixo para ajustar.
- **Remover:** arrastar para fora da área ou botão de lixeira em cada bloco (como hoje, `js/pinteo7.js:2418-2487`), com desfazer por cinco segundos em vez de confirmação.
- **Alvos de toque** com no mínimo 44×44 px; alças de arrastar explícitas (⋮⋮) à esquerda de cada bloco para não brigar com os campos.

### HTML ou SVG

Os blocos em si são HTML: formulários nativos, foco de teclado, leitores de tela, quebra de linha e CSS Grid dentro do bloco. SVG entra em três lugares, onde faz diferença:

1. **Silhueta de encaixe** (a "aba" em cima e o "entalhe" embaixo, ao estilo peça de quebra-cabeça) como `background` SVG ou `clip-path`, para o bloco parecer encaixável sem virar SVG inteiro.
2. **Ícones** (Lucide, SVG inline) nos blocos e na paleta: seta para frente, giro, caneta, repetição.
3. **Conectores** entre um `defina` e suas chamadas, opcional, desenhados numa camada SVG sobre a área de trabalho quando a criança passa o mouse sobre um `chame`.

Esboço de um bloco:

```
┌─⌒───────────────────────────────┐
│ ⋮⋮  →  frente  [ 100 ]  passos  🗑│
└───────────────⌣───────────────────┘
┌─⌒───────────────────────────────┐
│ ⋮⋮  ⟳  repetir [ 4 ] vezes      🗑│
│   ┌─⌒───────────────────────┐   │
│   │ ⋮⋮  →  frente [ 100 ]  🗑│   │
│   └───────────⌣──────────────┘   │
│   ┌─⌒───────────────────────┐   │
│   │ ⋮⋮  ↻  girar  [ 90 ]°  🗑│   │
│   └───────────⌣──────────────┘   │
└───────────────⌣───────────────────┘
```

Cor por categoria (movimento azul, caneta roxo, controle laranja, dados verde, operadores amarelo, procedimentos rosa), com contraste mínimo 4.5:1 do texto e diferenciação também por ícone, não só por cor.

### Blocos e texto

As abas "Blocos" e "Texto" mostram o mesmo programa. Ao rodar em modo blocos, o texto gerado aparece na aba Texto (como hoje, `js/pinteo7.js:737-746`), agora com um aviso "gerado a partir dos blocos". Editar o texto desliga os blocos daquele programa até a criança escolher "voltar aos blocos" (que descarta o texto) ou, se um dia existir texto → blocos, reimporta.

## 4. Animação

| Momento | Animação | Com `prefers-reduced-motion` |
|---|---|---|
| Tartaruga andando | Transição CSS de `transform` no sprite, 1 frame por segmento em "lento"; canvas desenha por frame | Sem transição; desenho completo de uma vez, sprite salta para o fim |
| Bloco solto na lista | Motion `layout` (os vizinhos deslizam para abrir espaço) | Sem deslize; inserção imediata |
| Bloco removido | Encolhe e some, 150 ms | Some |
| Erro de execução | O bloco ou a linha com erro ganha borda vermelha e o palco não sacode. Substitui `shake`/`explode` (`js/init.js:77-86`) | Igual |
| Trocar personagem | Crossfade de 200 ms no sprite | Troca direta |
| Abrir diálogo | `<dialog>` com fade de 120 ms | Sem fade |

Implementação: um único utilitário `motionAllowed()` que lê `matchMedia('(prefers-reduced-motion: reduce)')`, mais um interruptor "Animações" nas configurações, porque a criança pode preferir menos movimento mesmo sem a preferência do sistema.

Sons de clique e exclusão continuam (`sounds/`), com um interruptor e desligados por padrão em toque, onde já há retorno tátil.

## 5. Acessibilidade

- Toda ação tem botão real (`<button>`), rótulo em texto e ícone. Nada de `<a>` sem `href` com `onClick` (`index.html:444-454`).
- Blocos são itens de lista (`role="listitem"` dentro de `ul`), com nome acessível "bloco frente 100 passos". Reordenar também por teclado: bloco focado + Alt+seta move; Enter abre os campos.
- Foco visível em tudo; ordem de tabulação: barra, paleta, área de trabalho, ações, palco.
- O palco tem `aria-label` com um resumo ("desenho com 12 linhas") e a saída de `print` usa `aria-live="polite"`.
- Erros do LOGO em pt-BR (as mensagens atuais são boas) aparecem num painel abaixo da área de trabalho, não em modal, e o editor sublinha a posição quando o parser souber.
- Contraste AA, texto mínimo de 16 px, e Nunito continua (boa legibilidade para crianças).
- Testes com `@axe-core/playwright` (MPL-2.0) na suíte E2E.

## 6. Aparência

- Fundo claro neutro, palco branco com sombra leve, blocos com cantos arredondados de 10 px e cores saturadas mas não neon. Tema escuro via `prefers-color-scheme` é barato com tokens CSS (`--cor-*`) e vale pela demonstração.
- Personagens em 128×128 (regra do `CLAUDE.md`) aparecem grandes no seletor e a 32 px no palco, com o sprite ampliado nas velocidades lentas.
- Tela inicial: sem cadastro. Pergunta só "como você quer ser chamado?" (opcional) para assinar o compartilhamento, guardado em `localStorage`. O fluxo de `welcome.html` sai.
- Tutorial: Driver.js com quatro passos (paleta, área de trabalho, rodar, palco), disparado na primeira visita e disponível na ajuda. O vídeo continua na ajuda em `<video>` nativo com a legenda `legendas/pt-br.vtt`.
- Galeria de compartilhados numa página própria (`/galeria`), em grade com o PNG, o nome e um botão "abrir no Pinte o 7". Substitui o carrossel bxSlider e o fancyBox.

## 7. Quem chega pelos artigos e vídeos

A maior parte dos acessos não vem de crianças, e sim de quem chega pelos artigos publicados, pelas apresentações em congresso e pelos vídeos no YouTube: pesquisadores, universidades e público geral. Essas pessoas querem entender o projeto em um minuto, ver o app funcionando e, às vezes, entrar em contato. Hoje o site não ajuda: cai direto no app, e o contexto está só no `README.md`.

- **Página "Sobre"** (`/sobre`), curta: o que é o Pinte o 7, o contexto acadêmico (TCC no CESMAC, Maceió), links para as publicações, as apresentações e os vídeos, créditos (interpretador Papert de Thomas Figg, personagens originais), licença e contato. Um botão "Abrir o app" no topo.
- **Link discreto na barra** do app ("Sobre") e um rodapé na galeria.
- **Primeira impressão:** o app abre com um exemplo já desenhado no palco (como o `carregaExemplo` de hoje, `js/pinteo7.js:489-547`, mas sem carregar HTML de terceiros), para quem chega por um link ver algo acontecendo em segundos.
- **Compartilhável:** título e imagem de prévia (`og:title`, `og:image`) no HTML, para os links postados em redes e em slides mostrarem o palco.

No plano isso é item de baixa prioridade na etapa 10.

## 8. O que muda para o professor

Não há hoje um modo professor de fato (ver inventário, seção 5). Recomendação: não construir agora. Se voltar como feature, cabe na arquitetura como uma flag de `ui` que libera "mostrar código gerado sempre" e "exportar programa".
