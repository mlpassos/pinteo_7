# ADR-0002: Manter o interpretador Papert e portá-lo para TypeScript

> **Pesquisa histórica de setembro de 2026.** As decisões vigentes estão no [PRD](../../PRD.md) e na [ADR-0013](../../adr/0013-refactor-enxuto-e-layout-primeiro.md). Status, versões e contagens abaixo preservam o registro original e não substituem o planejamento de 23/10/2026.

- Status: proposto
- Data: 2026-09-29

## Contexto

O motor (`js/logo.js`, `js/parser.js`, cerca de mil linhas) é MIT (`Papert-License.txt`) e define o comportamento que os alunos e os 34 programas compartilhados conhecem: comandos em inglês com aliases (`js/logo.js:85-268`), mensagens de erro em pt-BR (`js/logo.js:86`) e detalhes como o gerador de aleatórios próprio (`js/logo.js:36-39`). Ele toca o DOM em `print` e `cleartext` (`js/logo.js:147`, `js/logo.js:154`).

## Decisão

Portar o motor para TypeScript puro, preservando gramática, comandos, aliases, mensagens e limites, com duas interfaces injetadas (`TurtleCommands`, `TextOutput`) e o **mesmo modelo de execução síncrono do legado**. A execução cooperativa por generator é decisão separada (ADR-0012), tomada só depois do porte estar verde na suíte de caracterização. Não adotar outro interpretador.

## Consequências

- Os testes de caracterização (ADR-0009) são o contrato do porte.
- Bugs do legado (`last`, `bitxor`, alias de `lessequal?`) ficam documentados e só mudam em PR próprio.
- Alternativas descartadas: jslogo (Apache-2.0) tem semântica UCBLogo e mensagens em inglês, e trocaria o comportamento; embrulhar o JS atual com `.d.ts` não resolve o acoplamento nem a qualidade.
