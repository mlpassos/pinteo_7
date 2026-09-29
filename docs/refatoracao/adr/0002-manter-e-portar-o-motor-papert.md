# ADR-0002: Manter o interpretador Papert e portá-lo para TypeScript

- Status: proposto
- Data: 2026-09-29

## Contexto

O motor (`js/logo.js`, `js/parser.js`, cerca de mil linhas) é MIT (`Papert-License.txt`) e define o comportamento que os alunos e os 68 programas compartilhados conhecem: comandos em inglês com aliases (`js/logo.js:85-268`), mensagens de erro em pt-BR (`js/logo.js:86`) e detalhes como o gerador de aleatórios próprio (`js/logo.js:36-39`). Ele toca o DOM em `print` e `cleartext` (`js/logo.js:147`, `js/logo.js:154`).

## Decisão

Portar o motor para TypeScript puro, preservando gramática, comandos, aliases, mensagens e limites, com duas interfaces injetadas (`TurtleCommands`, `TextOutput`) e execução como generator. Não adotar outro interpretador.

## Consequências

- Os testes de caracterização (ADR-0009) são o contrato do porte.
- Bugs do legado (`last`, `bitxor`, alias de `lessequal?`) ficam documentados e só mudam em PR próprio.
- Alternativas descartadas: jslogo (Apache-2.0) tem semântica UCBLogo e mensagens em inglês, e trocaria o comportamento; embrulhar o JS atual com `.d.ts` não resolve o acoplamento nem a qualidade.
