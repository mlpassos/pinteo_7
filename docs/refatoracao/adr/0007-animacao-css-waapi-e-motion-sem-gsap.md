# ADR-0007: Animação com CSS, Web Animations API e Motion; GSAP descartado

> **Pesquisa histórica de setembro de 2026.** As decisões vigentes estão no [PRD](../../PRD.md) e na [ADR-0013](../../adr/0013-refactor-enxuto-e-layout-primeiro.md). Status, versões e contagens abaixo preservam o registro original e não substituem o planejamento de 23/10/2026.

- Status: proposto
- Data: 2026-09-29

## Contexto

Há cerca de vinte efeitos jQuery ativos em `js/pinteo7.js`, 11 `@keyframes` em `css/home.css:136-300` e efeitos `shake`/`explode` no diálogo de erro (`js/init.js:77-86`). Nada respeita `prefers-reduced-motion`.

## Decisão

- Padrão: CSS transitions e Web Animations API, com um utilitário único que lê `prefers-reduced-motion` e um interruptor na interface.
- Motion 13.4.4 (MIT) só para animação de layout e listas (blocos deslizando ao reordenar).
- GSAP não entra: a "Standard No-Charge License" é gratuita, mas proprietária e não aprovada pela OSI, o que fere a regra de licença livre verificada do `CLAUDE.md`.

## Consequências

- Menos dependências; a maior parte das animações é CSS.
- Alternativa equivalente caso Motion não sirva: anime.js 4.5.0 (MIT).
