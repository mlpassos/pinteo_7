# ADR-0009: Testes de caracterização com programas de referência antes de qualquer porte

- Status: proposto
- Data: 2026-09-29

## Contexto

Não há testes. A prioridade é preservar o comportamento. O repo tem 68 programas reais em `compartilhados-code/` (pares `.txt` e `.cp7`) e um guia com exemplos em `comandos-logo.txt:196-214`. O motor é determinístico se `rerandom` for chamado (`js/logo.js:36-43`).

## Decisão

- Antes de portar o motor, gravar snapshots: para cada programa de referência, a sequência de chamadas à tartaruga, o texto impresso e o erro, obtidos do motor legado rodando em `vm` no Node com uma tartaruga que só grava.
- A mesma suíte roda contra o motor novo; diferenças são decisões explícitas registradas no fixture.
- Para o palco, comparação de PNG por programa com tolerância de 1 px. Para blocos, `blocksToLogo(importCp7(html))` deve reproduzir o `.txt` real.
- Playwright para fumaça: abrir, escolher personagem, rodar um programa, ver o desenho; `@axe-core/playwright` (MPL-2.0) para acessibilidade.
- CI (GitHub Actions rodando `pnpm test` e o Playwright em PR) é recomendada logo após a etapa 1 do plano, em issue própria; está fora do escopo da issue #2.

## Consequências

- Cada etapa do plano tem um critério de pronto verificável.
- Custo: a etapa 1 do plano (M) antes de qualquer código novo visível.
