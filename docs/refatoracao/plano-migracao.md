# Plano de migração incremental

Responde à pergunta 6 da issue #2. Regras: uma etapa por PR (ou poucos PRs pequenos por etapa), sempre na `main`, o app funcionando ao fim de cada PR, sem branch longa de reescrita. Tamanhos: P (até um dia), M (dois a quatro dias), G (uma a duas semanas).

Estratégia: **estrangulamento**. O app legado continua sendo servido intacto em `legacy/` enquanto as peças novas nascem ao lado, primeiro com testes, depois plugadas por adaptadores que expõem os mesmos globais que o legado espera (`Logo`, `DelayTurtle`, `cm`, `run`). Quando a última peça troca, `legacy/` é apagado.

## Visão geral

| # | Etapa | Tamanho | Risco | O que o usuário vê |
|---|---|---|---|---|
| 0 | Ferramental e `legacy/` | P | baixo | nada muda |
| 1 | Inventário de comandos e testes de caracterização do motor | M | baixo | nada muda |
| 2 | Porte do motor para TypeScript puro | M | médio | nada muda; adaptador mantém os globais |
| 3 | Vite serve o app; entrada `main.ts` | P | baixo | mesma tela, servida pelo Vite |
| 4 | Runtime da tartaruga, renderizador e agendador novos | M | médio | palco redimensionável, mesmas velocidades |
| 5 | CodeMirror 6 | P | baixo | editor igual, sem CDN |
| 6 | Casca React, estado e diálogos nativos | G | alto | layout novo em tela cheia |
| 7 | Blocos novos com importador de `.cp7` | G | alto | blocos novos; compartilhados antigos ainda abrem |
| 8 | Remover jQuery, jQuery UI e bibliotecas restritas | P | baixo | nada muda |
| 9 | API Node e Caddy | M | médio | compartilhar volta a funcionar em produção |
| 10 | Tutorial, vídeo, galeria e tela inicial | M | baixo | polimento |
| 11 | Apagar `legacy/` e atualizar docs | P | baixo | nada muda |

Duração total estimada, somando os tamanhos: de oito a doze semanas de trabalho contínuo de uma pessoa. As etapas 1 a 5 podem correr em paralelo com o deploy estático do app atual, porque não mudam o que é servido.

## Etapa 0: ferramental e `legacy/` (P)

- `package.json` com pnpm, TypeScript, Vitest, Biome, `.editorconfig`, `.nvmrc` (24).
- Mover o app atual para `legacy/` com um `index.html` na raiz que redireciona (ou, mais simples, manter o app na raiz nesta etapa e só criar `src/` e `tests/`). Recomendo manter na raiz até a etapa 3 para não mexer nos caminhos de `compartilhados/`.
- Adicionar `.gitignore` de `node_modules` e `dist`.
- Critério de pronto: `pnpm test` roda um teste trivial; `python3 -m http.server` continua servindo o app igual.
- Fora do escopo desta etapa e desta issue: CI. Recomendação registrada em ADR-0009 para uma issue própria.

## Etapa 1: inventário de comandos e testes de caracterização (M)

Objetivo: congelar o comportamento atual antes de tocar nele.

1. `tests/fixtures/programs/*.logo`: programas de referência. Fontes: os 68 arquivos `.txt` de `compartilhados-code/`, os exemplos de `comandos-logo.txt:196-214` e casos escritos à mão por grupo de comando (tabela do inventário, seção 3).
2. Harness que carrega o motor legado sem DOM: concatenar `js/parser.js`, `js/logo.js` e um `RecordingTurtle` num `vm.runInNewContext` do Node, com `textOutput` falso. Cada programa vira `{ calls: TurtleCall[], text: string[], error: string | null }`.
3. Gravar a saída como snapshot (`toMatchSnapshot`) e revisar à mão os casos que dependem de `random` (usar `rerandom 1` nos fixtures) e os bugs conhecidos (`last`, `bitxor`, `lessequal?`), marcados como "comportamento atual, a decidir".
4. Contrato de mensagens de erro: um fixture por mensagem em pt-BR do motor.

Critério de pronto: cobertura de todos os comandos da tabela e dos 68 programas compartilhados; suíte verde contra o legado.

Risco: programas com `forever` ou recursão infinita travam o harness. Mitigação: timeout por teste e lista de exclusão explícita.

## Etapa 2: porte do motor para TypeScript (M)

- `src/logo/` e `src/turtle/` conforme `arquitetura-proposta.md`, seções 2 e 3, com `TurtleCommands` e `TextOutput` injetados.
- A mesma suíte da etapa 1 roda contra o motor novo (troca só o harness). Diferenças aparecem no diff do snapshot.
- Adaptador `src/legacy-bridge/globals.ts`: expõe `window.Logo` e `window.DelayTurtle` com a mesma assinatura que `js/init.js:13-18` usa. `DelayTurtle` do adaptador implementa `TurtleCommands` chamando o `Turtle` canvas legado por enquanto.
- `index.html` troca `js/parser.js` e `js/logo.js` por um único `<script src="dist/logo-legacy.js">` (build de biblioteca do Vite em formato IIFE).

Critério de pronto: suíte verde; validação manual no navegador (palco desenha, erro aparece, velocidades funcionam).

Risco: diferenças sutis de coerção (`parseFloat(a[0]) != a[0]`, `js/logo.js:86`) e de `for…in` sobre arrays. Mitigação: os snapshots pegam; onde o legado é claramente bug, registrar a decisão no fixture.

## Etapa 3: Vite serve o app (P)

- `index.html` vira a entrada do Vite; os scripts legados restantes (`jquery`, `jquery-ui`, `turtle.js`, `init.js`, `pinteo7.js`) vão para `public/legacy/` e continuam como `<script>` clássicos.
- `src/main.ts` importa o motor novo e instala o adaptador antes dos scripts legados.
- `pnpm dev` e `pnpm build` funcionam; `dist/` é o que o Caddy vai servir.

Critério de pronto: `pnpm build && pnpm preview` mostra o app idêntico.

## Etapa 4: tartaruga, renderizador e agendador (M)

- `src/turtle/runtime.ts` (estado + `DrawOp`), `src/render/canvas-renderer.ts`, `src/render/sprite-layer.ts`, `src/animation/scheduler.ts`.
- O adaptador `DelayTurtle` passa a usar o runtime novo; `js/turtle.js` sai.
- O canvas passa a ter `devicePixelRatio` e redesenho do log ao redimensionar, ainda dentro do layout de 500 px.
- Testes: geometria pura (forward, right, arc, home) e renderizador com um `CanvasRenderingContext2D` falso que grava chamadas.

Critério de pronto: os 68 programas produzem o mesmo PNG do legado, comparado por Playwright com tolerância de 1 px (antialiasing); velocidades lento, normal e rápido preservadas.

Risco: `drawbits` (1 px por passo, `js/turtle.js:341-353`) e o giro do sprite por CSS (`js/turtle.js:214`) têm comportamento visual difícil de igualar. Mitigação: capturar vídeos ou capturas do legado como referência antes de trocar.

## Etapa 5: CodeMirror 6 (P)

- `src/editor/logo-language.ts` com `StreamLanguage.define()` portando `cm/logo.js`.
- `src/editor/create-editor.ts` cria a instância e expõe `getValue`/`setValue`/`onChange`.
- Adaptador expõe `window.cm` com `getValue` e `setValue` para `js/init.js:53-60` e os sete `cm.setValue` de `pinteo7.js`.
- Sai o CDN do cdnjs (`index.html:16-21`).

Critério de pronto: destaque de sintaxe, fechamento de colchetes e numeração de linha iguais; app funciona sem internet exceto pela fonte.

## Etapa 6: casca React, estado e diálogos (G)

A etapa mais arriscada. Dividir em PRs:

1. `src/store/` e `src/runner/` com testes, ainda sem UI.
2. `<App>` renderiza o layout novo (`layout-ux.md`, seção 2) **com a área de trabalho ainda legada**: a `<ol id="codeblocks">` e o menu antigo ficam num `<div dangerouslySetInnerHTML>` ou num iframe temporário. Recomendo a rota mais simples: o React envolve o HTML legado como está, e os `delegate` do jQuery continuam funcionando sobre ele.
3. Barra de ações, seletor de personagem, velocidade, ajuda e erros migram para componentes React e `<dialog>`; os handlers correspondentes em `pinteo7.js` são apagados a cada PR (`js/pinteo7.js:1885-2044`, `js/pinteo7.js:2096-2332`).
4. Texto de interface centralizado em `i18n/pt-BR.ts`.
5. CSS novo com tokens, grid e media queries; `css/home.css` e `css/papert.css` reduzidos ao que os blocos legados ainda precisam.

Critério de pronto por PR: validação manual (palco, personagem, ícones, fonte) e Playwright de fumaça: abrir, escolher personagem, rodar `repeat 4 [fw 100 rt 90]`, ver o desenho.

Risco: o layout novo e os blocos velhos convivendo. Mitigação: manter o `#codeblocks` com as mesmas classes até a etapa 7; não "melhorar" o CSS dos blocos legados.

## Etapa 7: blocos novos (G)

1. `src/program/blocks.ts`, `blocks-to-logo.ts` com testes que usam os 68 `.cp7` como entrada: `blocksToLogo(importCp7(html))` deve ser igual ao `.txt` correspondente, modulo espaços. Esse é o teste de aceitação da etapa.
2. `<BlocksWorkspace>` com Pragmatic DnD, paleta arrastável, campos nativos, teclado.
3. Trocar a área de trabalho legada pela nova; apagar `adicionarCodigo`, `BlocksParser`, `ativar*`, `checkForMoves` (`js/pinteo7.js:550-1786`).
4. Compartilhar passa a enviar JSON de blocos; `.cp7` só é lido, nunca gravado.

Critério de pronto: os 34 compartilhados abrem e rodam; um programa criado nos blocos novos gera o mesmo LOGO que o legado geraria; testes de toque no Playwright com `hasTouch`.

Risco: perder algum caso dos blocos legados (operadores aninhados, variável dentro de repetir). Mitigação: o teste com os 68 `.cp7` reais; e um PR só de importador antes do PR de interface.

## Etapa 8: remover jQuery e bibliotecas restritas (P)

Apagar `js/jquery-1.9.1.js`, `js/jquery-ui-1.10.4.custom.min.js`, `js/jquery.ui.touch-punch.min.js`, `js/jquery.fancybox.pack.js`, `js/jquery.bxslider.min.js`, `js/prefixfree.min.js`, `js/playr.js`, os CSS correspondentes, `styles/`, `js/intro.js`, `js/highlight.pack.js` e os `pinteo7*.old`. Conferir com `grep -r "jQuery\|\$(" src/` que nada sobrou.

Critério de pronto: `pnpm build` sem os arquivos; validação manual; tamanho do bundle registrado no PR.

## Etapa 9: API Node e Caddy (M)

- `api/` com Hono, Zod, armazenamento em disco e testes de rota.
- `src/persistence/api-share-store.ts` e `local-share-store.ts`; o app escolhe pelo `VITE_API_URL`.
- Migração dos 34 compartilhados: script que lê `compartilhados/` e `compartilhados-code/`, converte `.cp7` em JSON com o importador e grava em `DATA_DIR`.
- Caddyfile de exemplo em `docs/deploy.md` (configurar o droplet é fora do escopo da issue).
- Apagar `save.php`, `listar.php`, `getCidades.php`.

Critério de pronto: compartilhar e listar funcionam local com `pnpm dev:api`; testes de validação rejeitam HTML, PNG grande e método errado.

## Etapa 10: tutorial, vídeo, galeria e tela inicial (M)

- Driver.js para o tour; `<video>` nativo com `legendas/pt-br.vtt`; página `/galeria`; tela inicial sem cadastro. Apagar `welcome.html`, `header.html`, `wrapper.html`, `footer.html`, `help.html`, `js/welcome.js`.
- Remover o Google Analytics ou trocar por métrica sem cookie, com decisão registrada (LGPD, público infantil).

## Etapa 11: limpeza e documentação (P)

- Apagar `legacy/` ou `public/legacy/`, `init.js`, `pinteo7.js`.
- Atualizar `CLAUDE.md` (mapa novo, comandos para rodar, regra de camadas), `README.md`, mover ADRs aceitos para `docs/adr/`, gerar `docs/logo-comandos.md`.

## Como preservar o comportamento: resumo

| Comportamento | Como é protegido |
|---|---|
| Semântica dos comandos LOGO e mensagens de erro | Snapshots da etapa 1, rodados contra o motor novo em toda etapa |
| Desenho no palco | Comparação de PNG por programa (etapa 4) |
| Blocos → LOGO | 68 pares `.cp7`/`.txt` reais (etapa 7) |
| Compartilhados existentes | Importador de `.cp7` e script de migração (etapas 7 e 9) |
| Personagens e sorteio inicial | Teste E2E de fumaça (etapa 6) |
| Velocidades | Parâmetro de ops por frame mapeado de 25/5/1 (etapa 4) |

## Riscos transversais

- **Escopo crescendo**: cada etapa tem a tentação de "já que estou aqui". Regra: bugs do legado listados no inventário só são corrigidos em PR próprio, com o fixture atualizado de propósito.
- **Sem CI**: até existir, o revisor roda `pnpm test` e a validação manual. Recomendo abrir a issue de CI logo depois da etapa 1, quando já houver o que rodar.
- **Uma pessoa só**: as etapas G podem ficar semanas abertas. Os PRs parciais listados nas etapas 6 e 7 existem para que a `main` continue publicável no meio delas.
