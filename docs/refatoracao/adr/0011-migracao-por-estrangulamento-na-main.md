# ADR-0011: Migração por estrangulamento dentro da `main`, sem branch de reescrita

- Status: proposto
- Data: 2026-09-29

## Contexto

O `CLAUDE.md` exige PRs pequenos na `main`, sempre publicável, sem `dev` nem branch longa. O legado depende de globais (`Logo`, `DelayTurtle`, `cm`, `run`) definidos em `js/init.js:1-10` e `js/pinteo7.js:82`.

## Decisão

- O `index.html` da raiz é a página estrangulada. A etapa 0 não move nada. Na etapa 2, com o Vite, a árvore legada inteira (JS, CSS, `cm/`, fontes, imagens, sons, vídeos, legendas e compartilhados) vai junta para `public/legacy/`, preservando os `url()` relativos do CSS; só os caminhos que o `index.html` e o `pinteo7.js` montam a partir da página são reescritos com o prefixo `/legacy/`. `<base href>` foi descartado porque mudaria a resolução dos 54 `href="#"` da página. A árvore é apagada peça a peça. Não há cópia intacta do app numa pasta própria: seria um segundo app para manter.
- Cada peça nova entra por um adaptador que expõe os mesmos globais que o legado espera; o arquivo legado correspondente é apagado no mesmo PR.
- Ordem: ferramental → testes de caracterização → Vite e `public/legacy/` → porte 1:1 do motor → execução cooperativa → tartaruga e palco → editor → casca React → blocos → remoção do jQuery → API → polimento → limpeza → analytics opcional (`plano-migracao.md`).
- Bugs do legado só são corrigidos em PR próprio, com o fixture atualizado de propósito.

## Consequências

- Em nenhum momento a `main` deixa de funcionar; o deploy estático do app atual pode acontecer em paralelo às etapas 0 a 6.
- Custo: adaptadores temporários em `src/legacy-bridge/`, apagados na etapa 12.
- Alternativa descartada: reescrever em branch longa e trocar de uma vez; contraria o `CLAUDE.md` e some com a possibilidade de revisar por partes.
