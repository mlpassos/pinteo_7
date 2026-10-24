# ADR-0003: Domínio sem DOM, padrão Command e log de operações de desenho

> **Pesquisa histórica de setembro de 2026.** As decisões vigentes estão no [PRD](../../PRD.md) e na [ADR-0013](../../adr/0013-refactor-enxuto-e-layout-primeiro.md). Status, versões e contagens abaixo preservam o registro original e não substituem o planejamento de 23/10/2026.

- Status: proposto
- Data: 2026-09-29

## Contexto

`Turtle` mistura estado, canvas e sprite (`js/turtle.js:91-100`, `js/turtle.js:186-206`) e usa jQuery para girar o sprite (`js/turtle.js:214`). `DelayTurtle` já é uma fila de comandos adiados (`js/turtle.js:290-337`). Undo e redo foram planejados por `getImageData` e abandonados (`js/turtle.js:32-53`). O canvas é fixo em 500 px (`js/init.js:28-32`).

## Decisão

- O interpretador emite `TurtleCommand`s; o `TurtleRuntime` (puro) aplica cada um ao `TurtleState` imutável e devolve `DrawOp`s (linha, arco, limpar).
- A lista de `DrawOp` de uma execução é o desenho. Renderizadores (canvas para o palco, SVG para export) a consomem: padrão Strategy.
- Um agendador aplica as operações com orçamento por frame; velocidade é ops por frame.
- O sprite é uma camada HTML sobre o canvas, posicionada por `transform`.

## Consequências

- Undo, redimensionar, export para SVG e comparação em testes ficam triviais.
- O motor nunca importa `document`, `window` ou React.
- Alternativa descartada: SVG para o traço (programas com `repeat 360` e passos de 1 px gerariam dezenas de milhares de nós); canvas para o sprite (perde transição CSS e a troca de personagem barata).
