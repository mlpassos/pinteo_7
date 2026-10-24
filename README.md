PINTE O 7
=========

Este é um protótipo de Sistema Interativo para o ensino de lógica de programação para crianças desenvolvido durante um trabalho de conclusão de curso na faculdade CESMAC / Maceió-AL. 

A proposta inicial era apenas criar a interface baseada nas heurísticas de usabilidade de Jakob Nielsen, porém o projeto hoje em dia já caminha para algo mais. Desde a implementação do interpretador LOGO Papert, criado por Thomas Figg@Google Code, e lançado sob a licença MIT para software livre, o desenvolvimento tem continuado e buscado sempre melhorar a usabilidade e experiência do usuário, ao criar interações para usuários iniciantes, intermediários e avançados... 

Os testes começarão em breve. 

Caso sua escola, filho, sobrinho e/ou primo queira participar, entrar em contato.

Contato e sugestões: marciopassosbel [at] gmail [dot] com

## Status

O projeto voltou a ser mantido em 2026 e está sendo refatorado aos poucos. Este repositório substitui o antigo `mlpassos/pinteo7`, que o GitHub bloqueou em 2019 por conter uma fonte comercial. Esta versão usa só fontes livres e personagens originais.

O layout v6 foi aprovado por Márcio e integrado pelo PR #5 (`e7038fb`). A fundação TypeScript/React/Vite já está em desenvolvimento na T-062, com contratos e caracterização do Papert original. Motor novo, editor final e API ainda não estão integrados; produção não foi alterada.

- [PRD](docs/PRD.md), [arquitetura](docs/ARQUITETURA.md) e [contratos](docs/CONTRATOS.md)
- [Convenções](docs/CONVENCOES.md) e [regras para agentes](AGENTS.md)
- [Plano T-061–T-069](docs/PLANO.md) e [prompt da nova sessão com goal](docs/PROMPT-NOVA-SESSAO.md)

## Rodar localmente

Para a interface legada (sem instalar PHP):

```bash
python3 -m http.server 8077 --bind 127.0.0.1
```

Abra http://127.0.0.1:8077/. Galeria/compartilhamento ainda dependem dos PHPs legados e não funcionam integralmente no servidor estático. Há problemas conhecidos nos endpoints e na importação de HTML; não publicar o diretório nem reativar PHP para esse fim. O refactor os substituirá por API Node e importação segura.

### Fundação do refactor

Requer Node **24.22.1** e npm **11.19.1**. Dependências fixadas no lockfile; scripts de instalação são desativados por `.npmrc`.

```sh
npm ci --ignore-scripts
npm run dev
npm run check
npm test
npm run build
npm run docs
npm audit
```

A entrada temporária da fundação está em http://127.0.0.1:5177/. Não é a interface final: permite verificar React/Vite e build sem conectar motor/API ou expor a árvore legada. `dist/web/` contém somente essa entrada e os bundles; `node scripts/check-artifact.mjs` confere a allowlist. Nunca publicar a raiz do repositório. `npm run docs` gera `docs/reference/`, não versionado.

O protótipo aprovado continua disponível com `python3 design/prototipo/preview.py` em http://127.0.0.1:8080/. Decisão visual: [LAYOUT](docs/LAYOUT.md). Playwright está configurado; E2E de produto será introduzido na T-066/T-067, sem teste trivial da tela de aviso para simular aceite.

Preservação e comportamento real: [caracterização](docs/evidencias/t-062/legado.md). Os testes conferem hashes, executam os 34 exemplos no Papert original em VM com timeout efetivo e comparam a baseline. Regeneração de manifesto/baseline é operação explícita de manutenção, nunca parte de um teste.

## Como contribuir

- A `main` é a base de integração; publicação do refactor exige os critérios e o go descritos no plano. O legado atual ainda não atende esse aceite.
- Crie uma branch curta a partir da `main` (`codex/<task>`) e abra um PR conforme a autorização de trabalho.
- As releases são tags `vX.Y.Z`.

Detalhes e regras de assets em [CLAUDE.md](CLAUDE.md).

## Créditos e licenças

- Código do Pinte o 7: MIT ([LICENSE](LICENSE)).
- Interpretador LOGO Papert, de Thomas Figg: MIT ([Papert-License.txt](Papert-License.txt)).
- Fonte Nunito (Google Fonts) e ícones WebHostingHub Glyphs: SIL Open Font License.
- Personagens e ícones de aluno e professor: ilustrações originais criadas para o projeto.
- Bibliotecas de terceiros em `js/` (jQuery, jQuery UI, CodeMirror, highlight.js, bxSlider, Intro.js, Playr e outras) seguem as licenças de cada uma.
- fancyBox 2.1.5 tem licença restritiva CC BY-NC 3.0 e permanece somente no legado local; sua substituição é obrigatória e ele não integra o build novo.

--

This is an Interactive System Prototype designed for kids (not just for) to learn programming logic, developed initialy throughout my final graduation paper. P7 uses now a JavaScript LOGO Interpreter, Papert, by Thomas Figg and features both CLI and Block Interactions, Student and Teacher Mode, Simulated Memory, etc...

More english material, soon. 

Tests will begin soon with children from 8-12. 

Meanwhile, if you want to try it, drop me a line:

Contato, suggestions and messages: marciopassosbel [at] gmail [dot] com

