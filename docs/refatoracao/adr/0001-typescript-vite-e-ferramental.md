# ADR-0001: TypeScript, Vite e ferramental de base

- Status: proposto
- Data: 2026-09-29

## Contexto

O app não tem build, tipos nem testes (`CLAUDE.md`, "Rodar localmente"). O código de interface é um único `$(document).ready` de 2740 linhas (`js/pinteo7.js:73-2812`) com globais implícitos (`js/pinteo7.js:82`, `js/pinteo7.js:308`). A prioridade declarada na issue #2 é qualidade e organização.

## Decisão

- TypeScript 7.0.2 (Apache-2.0) em modo `strict` para todo código novo. Se algum plugin ainda não suportar a linha 7, fixar a última 6.x.
- Vite 8.3.1 (MIT) como dev server e build; `index.html` é a entrada.
- Vitest 5.0.2 (MIT) para testes unitários, Playwright 1.63.0 (Apache-2.0) para navegador.
- Biome 2.5.14 (MIT OR Apache-2.0) para lint e formatação, pnpm 12.6.0 (MIT) como gerenciador.
- Node 24 LTS como alvo de desenvolvimento e do backend; `engines` aceita `>=22` enquanto o droplet ficar no 22.

## Consequências

- Passa a existir `node_modules` e um passo de build; o deploy serve `dist/`.
- O app legado continua sendo servido sem build até a etapa 3 do plano.
- Alternativas descartadas: esbuild puro (sem dev server com HMR e sem plugin React), Webpack (mais configuração sem ganho), Jest (mais lento que o Vitest com Vite), ESLint + Prettier (dois binários e configuração de conflito; Biome cobre o necessário).
