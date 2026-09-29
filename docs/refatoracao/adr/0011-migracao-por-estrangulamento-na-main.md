# ADR-0011: Migração por estrangulamento dentro da `main`, sem branch de reescrita

- Status: proposto
- Data: 2026-09-29

## Contexto

O `CLAUDE.md` exige PRs pequenos na `main`, sempre publicável, sem `dev` nem branch longa. O legado depende de globais (`Logo`, `DelayTurtle`, `cm`, `run`) definidos em `js/init.js:1-10` e `js/pinteo7.js:82`.

## Decisão

- O `index.html` da raiz é a página estrangulada. Os JS e CSS legados ficam em `public/legacy/` desde a etapa 0, servidos pelo Vite como estão, e são apagados peça a peça. Não há cópia intacta do app numa pasta própria: seria um segundo app para manter.
- Cada peça nova entra por um adaptador que expõe os mesmos globais que o legado espera; o arquivo legado correspondente é apagado no mesmo PR.
- Ordem: ferramental e Vite → testes de caracterização → porte 1:1 do motor → execução cooperativa → tartaruga e palco → editor → casca React → blocos → remoção do jQuery → API → polimento → limpeza → analytics opcional (`plano-migracao.md`).
- Bugs do legado só são corrigidos em PR próprio, com o fixture atualizado de propósito.

## Consequências

- Em nenhum momento a `main` deixa de funcionar; o deploy estático do app atual pode acontecer em paralelo às etapas 1 a 5.
- Custo: adaptadores temporários em `src/legacy-bridge/`, apagados na etapa 11.
- Alternativa descartada: reescrever em branch longa e trocar de uma vez; contraria o `CLAUDE.md` e some com a possibilidade de revisar por partes.
