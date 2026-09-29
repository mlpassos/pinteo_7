# ADR-0006: Blocos próprios em HTML com Pragmatic drag and drop, não Blockly

- Status: proposto
- Data: 2026-09-29

## Contexto

Os blocos são `<li>` aninhados com campos `contenteditable` e atributos `data-*` como modelo (`js/pinteo7.js:1572-1650`, `js/pinteo7.js:911-947`), traduzidos para LOGO por `BlocksParser` (`js/pinteo7.js:550-718`). O formato compartilhado `.cp7` é o HTML cru dessa lista (`js/pinteo7.js:2617`), e há 34 compartilhados a preservar. Arrastar usa jQuery UI com Touch Punch.

## Decisão

- Modelo de dados tipado (`Block[]`) com serialização para LOGO e JSON, mais um importador de `.cp7`.
- Blocos renderizados em HTML (campos `<input>` nativos, teclado, leitores de tela), com SVG só em silhuetas, ícones e conectores.
- Arrastar e soltar com `@atlaskit/pragmatic-drag-and-drop` 4.0.0 (Apache-2.0), Pointer Events, toque nativo.

## Consequências

- Preserva aparência, o mapeamento um bloco por comando e a compatibilidade com os compartilhados.
- Alternativas descartadas: Blockly 13.3.0 (Apache-2.0) substitui o modelo e o visual por um workspace SVG próprio, gera código só em uma direção e dificulta o importador de `.cp7`; fica como plano se o projeto quiser virar um "Scratch de LOGO". `@dnd-kit/core` (MIT) sem release há cerca de dois anos. interact.js (MIT) mais genérico e menos ativo.
