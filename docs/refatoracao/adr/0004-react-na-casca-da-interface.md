# ADR-0004: React 19 só na casca da interface

- Status: proposto
- Data: 2026-09-29

## Contexto

O estado da interface hoje mora no DOM: modo blocos ou texto por `:hidden` (`js/pinteo7.js:727`), personagem pelo `src` do sprite (`js/pinteo7.js:1919`), execução por classes CSS (`js/pinteo7.js:2111-2135`). A sincronia estado → DOM feita à mão é a origem das duplicações (quatro cópias do handler de drop, seis do diálogo de erro). O `CLAUDE.md` define React como direção.

## Decisão

React 19.3.0 (MIT) para menus, modos, diálogos, paleta e a lista de blocos. Palco, editor e o arrastar e soltar são código imperativo embrulhado em componentes que os criam uma vez. Estado da aplicação em uma store pequena (Zustand 5.0.15, MIT) ou `useReducer`; o domínio nunca importa a store.

## Consequências

- Tudo abaixo da casca (`logo/`, `turtle/`, `program/`, `render/`) fica sem framework; trocar React por Preact é um alias no Vite.
- Alternativas descartadas: sem framework (viável, mas recria a sincronia manual justamente na parte com mais estado, ver `avaliacao-stack.md` seção 3); Preact (economia de 40 kB não compensa perder compatibilidade direta com Motion e o ecossistema); Svelte, Solid e Lit (sem vantagem que justifique sair da direção definida).
