PINTE O 7
=========

Este é um protótipo de Sistema Interativo para o ensino de lógica de programação para crianças desenvolvido durante um trabalho de conclusão de curso na faculdade CESMAC / Maceió-AL. 

A proposta inicial era apenas criar a interface baseada nas heurísticas de usabilidade de Jakob Nielsen, porém o projeto hoje em dia já caminha para algo mais. Desde a implementação do interpretador LOGO Papert, criado por Thomas Figg@Google Code, e lançado sob a licença MIT para software livre, o desenvolvimento tem continuado e buscado sempre melhorar a usabilidade e experiência do usuário, ao criar interações para usuários iniciantes, intermediários e avançados... 

Os testes começarão em breve. 

Caso sua escola, filho, sobrinho e/ou primo queira participar, entrar em contato.

Contato e sugestões: marciopassosbel [at] gmail [dot] com

## Status

O projeto voltou a ser mantido em 2026 e está sendo refatorado aos poucos. Este repositório substitui o antigo `mlpassos/pinteo7`, que o GitHub bloqueou em 2019 por conter uma fonte comercial. Esta versão usa só fontes livres e personagens originais.

Em 23/10/2026 o código ainda é legado; PRD e arquitetura estão documentados, sem implementação iniciada. Primeira task: validar layout em HTML com dados fictícios. Não há protótipo novo ou deploy confirmado nesta entrega documental.

- [PRD](docs/PRD.md), [arquitetura](docs/ARQUITETURA.md) e [contratos](docs/CONTRATOS.md)
- [Convenções](docs/CONVENCOES.md) e [regras para agentes](AGENTS.md)
- [Plano T-061–T-069](docs/PLANO.md) e [prompt da nova sessão com goal](docs/PROMPT-NOVA-SESSAO.md)

## Rodar localmente

Não precisa de build nem de instalação:

```bash
python3 -m http.server 8077 --bind 127.0.0.1
```

Abra http://127.0.0.1:8077/. Galeria/compartilhamento ainda dependem dos PHPs legados e não funcionam integralmente no servidor estático. Há problemas conhecidos nos endpoints e na importação de HTML; não publicar o diretório nem reativar PHP para esse fim. O refactor os substituirá por API Node e importação segura.

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
- fancyBox 2.1.5 usa licença CC BY-NC 3.0, livre apenas para uso não comercial. Se o projeto tiver uso comercial, troque por outra biblioteca.

--

This is an Interactive System Prototype designed for kids (not just for) to learn programming logic, developed initialy throughout my final graduation paper. P7 uses now a JavaScript LOGO Interpreter, Papert, by Thomas Figg and features both CLI and Block Interactions, Student and Teacher Mode, Simulated Memory, etc...

More english material, soon. 

Tests will begin soon with children from 8-12. 

Meanwhile, if you want to try it, drop me a line:

Contato, suggestions and messages: marciopassosbel [at] gmail [dot] com

