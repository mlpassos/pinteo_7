# ADR-0010: Remover bibliotecas com licença restritiva, arquivadas ou sem uso

- Status: proposto
- Data: 2026-09-29

## Contexto

A regra do `CLAUDE.md` é licença livre verificada. Em uso: fancyBox 2.1.5 (CC BY-NC 3.0, `index.html:41`), prefixfree (MIT, repositório arquivado, `index.html:36`), Touch Punch, bxSlider e Playr (MIT, sem manutenção). Sem uso: Intro.js 1.0.0 (MIT, `js/intro.js`), highlight.js e 48 temas em `styles/`, `js/jquery-ui.js`, os `pinteo7*.old`. Google Analytics com cookies num app infantil (`index.html:118-124`).

## Decisão

- Remover fancyBox, prefixfree, Touch Punch, bxSlider, Playr, Intro.js, highlight.js, os temas e os arquivos `.old`, nas etapas 8 e 10 do plano.
- Substitutos: `<dialog>` nativo, CSS `scroll-snap`, `<video>` nativo com `legendas/pt-br.vtt`, Driver.js 1.8.0 (MIT) para o tour. Não adotar Intro.js 8.x nem Shepherd.js (AGPL-3.0). PhotoSwipe 5.4.4 (MIT) só se a galeria precisar de lightbox.
- Ícones: Lucide (`lucide-react` 1.48.0, ISC) em SVG inline, dispensando a fonte `fonts/icomoon.*` e a necessidade de regenerar subconjuntos.
- Remover o Google Analytics ou trocar por métrica sem cookies, com a decisão registrada.

## Consequências

- Menos 100 arquivos no repo e nenhuma dependência com restrição de uso.
- A fonte de ícones WebHostingHub Glyphs (OFL, sem arquivo de licença no repo) deixa de ser necessária.
