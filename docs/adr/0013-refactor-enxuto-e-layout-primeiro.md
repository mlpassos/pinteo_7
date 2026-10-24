# ADR-0013 — Refactor enxuto, conversão segura e layout primeiro

- Status: aceito, com validação visual pendente na T-061.
- Data: 23/10/2026.
- Origem: decisões explícitas de Márcio no planejamento e aprovação para documentar/criar fila. Implementação e servidor não autorizados nesta rodada.

## Contexto

PR #3 entregou pesquisa, não implementação. Issue #4 pede design do código. A proposta anterior tem 14 etapas, algumas dependências invertidas, versões incompatíveis com lint/documentação e considera apenas blocos → texto. O dono quer um refactor completo e enxuto, preservando funções, com layout novo validado primeiro e futura execução orquestrada por Codex.

## Decisão

Adotar PRD, ARQUITETURA, CONTRATOS, CONVENCOES e PLANO como especificação atual. Protótipo HTML mockado é a primeira task; implementação só após aprovação do layout. Preservar 19 opções visuais e 21 personagens; converter nos dois sentidos somente quando integralmente representável, mantendo CLI/fonte em caso contrário. Nenhum bloco de código genérico e nenhuma expansão para os 63 comandos sem visual próprio.

TypeScript 6 compatível com ferramentas, React/Vite, npm, ESLint tipado/Prettier/Knip, CodeMirror 6, Pragmatic DnD, Node 24 corrigido/Hono/Zod. JSON/PNG em disco; fonte LOGO canônica e blocos como projeção; sem login/banco/SSR. Testes de caracterização antecedem o porte, e mudanças do avaliador são isoladas. JSDoc/TypeDoc e contratos verificáveis precedem integração. Audit completo deve começar e terminar sem vulnerabilidades reportadas.

## Disposição dos ADRs anteriores

Os textos em `docs/refatoracao/adr/` permanecem históricos; esta matriz determina o que foi aceito. Não interpretar seu status original como uma fila paralela de decisões pendentes.

| ADR de setembro | Disposição em outubro |
|---|---|
| 0001 ferramental | Substituído: TS6, npm, ESLint/Prettier/Knip; versões revalidadas, CI na fundação. |
| 0002 Papert | Aceito com ajuste: caracterizar bugs e corrigir defeitos em mudanças explícitas com testes. |
| 0003 domínio/Command | Aceito parcialmente: domínio puro e log; undo/SVG ficam fora da entrega. |
| 0004 React | Aceito com ajuste: reducer/contextos, sem Zustand nesta base. |
| 0005 CodeMirror | Aceito: CM6 com highlight LOGO, sem CDN. |
| 0006 blocos | Aceito com ajuste: 19 opções, conversão bidirecional parcial segura; DnD nativo, não Pointer Events garantidos. |
| 0007 animação | Substituído: CSS suficiente; Motion/GSAP não entram por antecipação. |
| 0008 API | Aceito com ajuste: API v1, JSON de programa com fonte canônica, PNG validado, sem HTML/blocos duplicados persistidos; quotas e escrita anônima controlada. |
| 0009 caracterização | Aceito: 34 programas/conjuntos, testes reais e CI cedo. |
| 0010 limpeza | Aceito com ajuste: retirada junto das substituições; preservar licenças e excluir artefatos legados da publicação. Intro.js local 1.0 é MIT, não confundir com versões posteriores. |
| 0011 migração | Substituído: módulos graduais e entrada temporária local; não copiar árvore inteira para public nem manter função de salvar quebrada como aceite. |
| 0012 execução | Aceito com ajuste: ceder também em avaliações/laços sem desenho; apenas executar/parar e velocidades nesta entrega. |

## Consequências

Menos infraestrutura e menos estados duplicados. Conversor precisa preservar fonte/comentários e pode recusar troca para Visual, comportamento explicitamente aceito. Texto→blocos e preservação de comentários são riscos de esforço; não justificar perda de código por prazo. Protótipo é estudo descartável, não precisa virar código final.

O plano tem nove tasks (T-061–T-069), com gate visual inicial e go de publicação final. Novas necessidades de produto retornam ao dono; ajustes técnicos compatíveis ficam com o arquiteto. Não criar conta, instalar banco, alterar servidor ou declarar a entrega pronta nesta rodada documental.
