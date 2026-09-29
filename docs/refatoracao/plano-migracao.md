# Plano de migração incremental

Responde à pergunta 6 da issue #2. Regras: uma etapa por PR (ou poucos PRs pequenos por etapa), sempre na `main`, o app funcionando ao fim de cada PR, sem branch longa de reescrita. Tamanhos: P, M e G são relativos entre si, não prazos. O projeto é um hobby feito em parceria com Claude e Codex; o ritmo é devagar e prazo não é critério. O que importa é cada etapa deixar o código melhor do que estava.

Estratégia: **estrangulamento**. O `index.html` da raiz é a página que vai sendo estrangulada; os arquivos legados (JS e CSS) moram em `public/legacy/` desde a etapa 0 e são apagados um a um conforme as peças novas em `src/` os substituem. Não existe uma cópia intacta do app numa pasta própria: seria um segundo app para manter, e o Vite já serve `public/` como está, sem bundling, o que é exatamente o que os `<script>` clássicos precisam. Cada peça nova entra por um adaptador que expõe os mesmos globais que o legado espera (`Logo`, `DelayTurtle`, `cm`, `run`).

A URL `pinteo7.instadev.com.br` continua servindo o app atual durante toda a migração, a partir da última tag; nada aqui depende do deploy.

## Visão geral

| # | Etapa | Tamanho | Risco | O que o usuário vê |
|---|---|---|---|---|
| 0 | Ferramental, Vite e `public/legacy/` | P | baixo | nada muda |
| 1 | Inventário de comandos e testes de caracterização do motor | M | baixo | nada muda |
| 2 | Porte 1:1 do motor para TypeScript | M | médio | nada muda; adaptador mantém os globais |
| 3 | Execução cooperativa (pausa, parada, passo a passo) | M | médio | `forever` não trava mais; botão parar responde na hora |
| 4 | Runtime da tartaruga, renderizador e agendador novos | M | médio | palco redimensionável, mesmas velocidades |
| 5 | CodeMirror 6 | P | baixo | editor igual, sem CDN |
| 6 | Casca React, estado e diálogos nativos | G | alto | layout novo em tela cheia; o GA sai junto |
| 7 | Blocos novos com importador de `.cp7` | G | alto | blocos novos; compartilhados antigos ainda abrem |
| 8 | Remover jQuery, jQuery UI e bibliotecas restritas | P | baixo | nada muda |
| 9 | API Node e Caddy | M | médio | compartilhar volta a funcionar em produção |
| 10 | Tutorial, vídeo, galeria, tela inicial e página "Sobre" | M | baixo | polimento |
| 11 | Apagar `public/legacy/` e atualizar docs | P | baixo | nada muda |
| 12 | Analytics básico (opcional) | P | baixo | nada muda |

As etapas 1 a 5 não mudam o que a pessoa vê e podem acontecer enquanto o app atual segue no ar.

## Etapa 0: ferramental, Vite e `public/legacy/` (P)

- `package.json` com pnpm, TypeScript, Vite, Vitest, Biome, `.editorconfig`, `.nvmrc` (24), `.gitignore` de `node_modules` e `dist`.
- `index.html` vira a entrada do Vite. Os JS e CSS legados vão para `public/legacy/` (mantendo `js/`, `css/`, `cm/` dentro dela) e os assets (`images/`, `sounds/`, `videos/`, `legendas/`, `fonts/`, `compartilhados/`, `compartilhados-code/`) vão para `public/`. Os `<script>` e `<link>` do `index.html` passam a apontar para `/legacy/...`; continuam clássicos, sem bundling. Os PHPs ficam na raiz até a etapa 9.
- `src/main.ts` existe, vazio, como `<script type="module">` no `index.html`.
- Critério de pronto: `pnpm dev` e `pnpm build && pnpm preview` mostram o app idêntico; `pnpm test` roda um teste trivial. Validação manual: palco desenha, personagem troca, ícones e fonte carregam.
- Fora do escopo desta etapa e desta issue: CI. Recomendação registrada no ADR-0009 para uma issue própria.

## Etapa 1: inventário de comandos e testes de caracterização (M)

Objetivo: congelar o comportamento atual antes de tocar nele.

1. `tests/fixtures/programs/*.logo`: programas de referência. Fontes: os 34 programas `.txt` de `compartilhados-code/`, os exemplos de `comandos-logo.txt:196-214` e casos escritos à mão por grupo de comando (tabela do inventário, seção 3).
2. Harness que carrega o motor legado sem DOM: concatenar `public/legacy/js/parser.js`, `public/legacy/js/logo.js` e um `RecordingTurtle` num `vm.runInNewContext` do Node, com `textOutput` falso. Cada programa vira `{ calls: TurtleCall[], text: string[], error: string | null }`.
3. Gravar a saída como snapshot (`toMatchSnapshot`) e revisar à mão os casos que dependem de `random` (usar `rerandom 1` nos fixtures) e os bugs conhecidos (`last`, `bitxor`, `lessequal?`), marcados como "comportamento atual, a decidir".
4. Contrato de mensagens de erro: um fixture por mensagem em pt-BR do motor.

Critério de pronto: cobertura de todos os comandos da tabela e dos 34 programas compartilhados; suíte verde contra o legado.

Risco: programas com `forever` ou recursão infinita travam o harness. Mitigação: timeout por teste e lista de exclusão explícita.

## Etapa 2: porte 1:1 do motor para TypeScript (M)

Porte fiel, com o **mesmo modelo de execução do legado**: `run(code)` síncrono que avalia tudo de uma vez e devolve o erro ou `null`. Nada de generator nesta etapa.

- `src/logo/` (tokenizer, parser, AST, interpretador, primitivas) conforme `arquitetura-proposta.md`, seção 2, com `TurtleCommands` e `TextOutput` injetados.
- A mesma suíte da etapa 1 roda contra o motor novo (troca só o harness). Toda diferença aparece no diff do snapshot e é uma decisão explícita.
- Adaptador `src/legacy-bridge/globals.ts`: expõe `window.Logo` com a mesma assinatura que `js/init.js:13-18` usa (`new Logo()`, `setTurtle`, `setTextOutput`, `run`). `TurtleCommands` é satisfeito pelo `DelayTurtle` legado como está, e `TextOutput` por um objeto que escreve no `#textOutput`. O `src/main.ts` instala o global antes do `$(document).ready` (módulos rodam antes do `DOMContentLoaded`).
- `index.html` deixa de carregar `/legacy/js/parser.js` e `/legacy/js/logo.js`; os dois arquivos são apagados.

Critério de pronto: suíte verde; validação manual no navegador (palco desenha, erro aparece, velocidades funcionam).

Risco: diferenças sutis de coerção (`parseFloat(a[0]) != a[0]`, `js/logo.js:86`) e de `for…in` sobre arrays. Mitigação: os snapshots pegam; onde o legado é claramente bug, registrar a decisão no fixture.

## Etapa 3: execução cooperativa (M)

Só depois do porte verde. Decisão própria (ADR-0012).

- O interpretador ganha `run*(code): Generator<TurtleCommand, LogoError | null>` que cede o controle a cada comando de tartaruga. O `run` síncrono continua existindo e passa a ser "drenar o generator até o fim", então a suíte da etapa 1 continua valendo sem mudança.
- `src/runner/`: consome o generator com orçamento de tempo por frame (`requestAnimationFrame`), com `start`, `pause`, `resume`, `stop`, `step` e eventos `progress`, `done`, `error`.
- Diferenças de comportamento, documentadas em `docs/modulos/runner.md` e cobertas por testes próprios: `forever` e recursão sem fim não travam a aba; "Parar" interrompe na hora em vez de esperar a fila do `DelayTurtle`; a ordem entre `print` e o desenho passa a ser a ordem de execução, frame a frame.
- O adaptador legado continua usando o `run` síncrono; o `Runner` só é ligado à interface na etapa 6.

Critério de pronto: testes do `Runner` (orçamento por frame, pausa no meio de um `repeat`, parada dentro de `forever`); suíte de caracterização inalterada e verde.

## Etapa 4: tartaruga, renderizador e agendador (M)

- `src/turtle/runtime.ts` (estado + `DrawOp`), `src/render/canvas-renderer.ts`, `src/render/sprite-layer.ts`, `src/animation/scheduler.ts`.
- O adaptador `DelayTurtle` passa a ser implementado sobre o runtime novo; `/legacy/js/turtle.js` sai.
- O canvas passa a ter `devicePixelRatio` e redesenho do log ao redimensionar, ainda dentro do layout de 500 px.
- Testes: geometria pura (forward, right, arc, home) e renderizador com um `CanvasRenderingContext2D` falso que grava chamadas.

Critério de pronto: os 34 programas produzem o mesmo PNG do legado, comparado por Playwright com tolerância de 1 px (antialiasing); velocidades lento, normal e rápido preservadas.

Risco: `drawbits` (1 px por passo, `js/turtle.js:341-353`) e o giro do sprite por CSS (`js/turtle.js:214`) têm comportamento visual difícil de igualar. Mitigação: capturar vídeos ou capturas do legado como referência antes de trocar.

## Etapa 5: CodeMirror 6 (P)

- `src/editor/logo-language.ts` com `StreamLanguage.define()` portando `cm/logo.js`.
- `src/editor/create-editor.ts` cria a instância e expõe `getValue`/`setValue`/`onChange`.
- Adaptador expõe `window.cm` com `getValue` e `setValue` para `js/init.js:53-60` e os sete `cm.setValue` de `pinteo7.js`.
- Sai o CDN do cdnjs (`index.html:16-21`) e sai `/legacy/cm/`.

Critério de pronto: destaque de sintaxe, fechamento de colchetes e numeração de linha iguais; app funciona sem internet exceto pela fonte.

## Etapa 6: casca React, estado e diálogos (G)

A etapa mais arriscada. Dividir em PRs:

1. `src/store/` com testes, ainda sem UI; o `Runner` da etapa 3 é ligado à store.
2. `<App>` renderiza o layout novo (`layout-ux.md`, seção 2) **com a área de trabalho ainda legada**: a `<ol id="codeblocks">` e o menu antigo ficam num `<div dangerouslySetInnerHTML>`. O React envolve o HTML legado como está, e os `delegate` do jQuery continuam funcionando sobre ele.
3. Barra de ações, seletor de personagem, velocidade, ajuda e erros migram para componentes React e `<dialog>`; os handlers correspondentes em `pinteo7.js` são apagados a cada PR (`js/pinteo7.js:1885-2044`, `js/pinteo7.js:2096-2332`). O script do Google Analytics Universal (`index.html:118-124`, produto já descontinuado) sai neste momento, sem etapa própria.
4. Texto de interface centralizado em `i18n/pt-BR.ts`.
5. CSS novo com tokens, grid e media queries; `home.css` e `papert.css` reduzidos ao que os blocos legados ainda precisam.

Critério de pronto por PR: validação manual (palco, personagem, ícones, fonte) e Playwright de fumaça: abrir, escolher personagem, rodar `repeat 4 [fw 100 rt 90]`, ver o desenho.

Risco: o layout novo e os blocos velhos convivendo. Mitigação: manter o `#codeblocks` com as mesmas classes até a etapa 7; não "melhorar" o CSS dos blocos legados.

## Etapa 7: blocos novos (G)

1. `src/program/blocks.ts`, `blocks-to-logo.ts` com testes que usam os 34 `.cp7` como entrada: `blocksToLogo(importCp7(html))` deve ser igual ao `.txt` correspondente, modulo espaços. Esse é o teste de aceitação da etapa.
2. `<BlocksWorkspace>` com Pragmatic DnD, paleta arrastável, campos nativos, teclado.
3. Trocar a área de trabalho legada pela nova; apagar `adicionarCodigo`, `BlocksParser`, `ativar*`, `checkForMoves` (`js/pinteo7.js:550-1786`).
4. Compartilhar passa a enviar JSON de blocos; `.cp7` só é lido, nunca gravado.

Critério de pronto: os 34 compartilhados abrem e rodam; um programa criado nos blocos novos gera o mesmo LOGO que o legado geraria; testes de toque no Playwright com `hasTouch`.

Risco: perder algum caso dos blocos legados (operadores aninhados, variável dentro de repetir). Mitigação: o teste com os 34 pares `.cp7`/`.txt` reais; e um PR só de importador antes do PR de interface.

## Etapa 8: remover jQuery e bibliotecas restritas (P)

Apagar de `public/legacy/`: `jquery-1.9.1.js`, `jquery-ui-1.10.4.custom.min.js`, `jquery.ui.touch-punch.min.js`, `jquery.fancybox.pack.js`, `jquery.bxslider.min.js`, `prefixfree.min.js`, `playr.js`, os CSS correspondentes, `styles/`, `intro.js`, `highlight.pack.js` e os `pinteo7*.old`. Conferir com `grep -r "jQuery\|\$(" src/` que nada sobrou.

Critério de pronto: `pnpm build` sem os arquivos; validação manual; tamanho do bundle registrado no PR.

## Etapa 9: API Node e Caddy (M)

- `api/` com Hono, Zod, armazenamento em disco e testes de rota.
- `src/persistence/api-share-store.ts` e `local-share-store.ts`; o app escolhe pelo `VITE_API_URL`.
- Migração dos 34 compartilhados: script que lê `public/compartilhados/` e `public/compartilhados-code/`, converte `.cp7` em JSON com o importador e grava em `DATA_DIR`.
- Caddyfile de exemplo em `docs/deploy.md` (configurar o droplet é fora do escopo da issue).
- Apagar `save.php`, `listar.php`, `getCidades.php`.

Critério de pronto: compartilhar e listar funcionam local com `pnpm dev:api`; testes de validação rejeitam HTML, PNG grande e método errado.

## Etapa 10: tutorial, vídeo, galeria, tela inicial e "Sobre" (M)

- Driver.js para o tour; `<video>` nativo com `legendas/pt-br.vtt`; página `/galeria`; tela inicial sem cadastro. Apagar `welcome.html`, `header.html`, `wrapper.html`, `footer.html`, `help.html`, `js/welcome.js`.
- Baixa prioridade, dentro desta etapa ou depois: página "Sobre" com o contexto acadêmico do projeto, links para as publicações, as apresentações e os vídeos no YouTube, créditos (Papert, personagens) e contato. Ver `layout-ux.md`, seção 8. É a porta de entrada de quem chega pelos artigos.

## Etapa 11: limpeza e documentação (P)

- Apagar o que restar de `public/legacy/` (`init.js`, `pinteo7.js`, CSS) e `src/legacy-bridge/`.
- Atualizar `CLAUDE.md` (mapa novo, comandos para rodar, regra de camadas), `README.md`, mover ADRs aceitos para `docs/adr/`, gerar `docs/logo-comandos.md`.

## Etapa 12: analytics básico (P, opcional)

Curiosidade, não requisito: de onde vêm os acessos (país, cidade, hora, tempo de visita), com algo gratuito e simples que caiba no droplet (Caddy e Node). Sem aprofundar, três candidatos:

| Candidato | Como funciona | Licença | Observação |
|---|---|---|---|
| GoAccess a partir dos logs do Caddy | Caddy grava logs em JSON; o GoAccess gera um relatório HTML estático, por cron ou em tempo real. Nenhum JS na página, nenhum cookie. | MIT | Mais simples; país e cidade dependem de um banco GeoIP local (por exemplo, o gratuito da MaxMind, GeoLite2, que exige cadastro). Tempo de visita fica aproximado. |
| GoatCounter, hospedado por nós | Um binário Go com SQLite, um `<script>` leve na página, painel próprio. | EUPL-1.2 | Dá país, referência e tempo; sem cookies. Uma unidade de systemd a mais no droplet. |
| Umami, hospedado por nós | App Node com PostgreSQL ou MySQL, `<script>` leve, painel bonito. | MIT | Mais pesado por causa do banco; só vale se o painel importar. |

Recomendação, se um dia for feito: começar pelo GoAccess sobre os logs do Caddy, porque não muda nada no app.

## Como preservar o comportamento: resumo

| Comportamento | Como é protegido |
|---|---|
| Semântica dos comandos LOGO e mensagens de erro | Snapshots da etapa 1, rodados contra o motor novo em toda etapa |
| Modelo de execução | O `run` síncrono continua existindo depois da etapa 3 e é o que a suíte testa |
| Desenho no palco | Comparação de PNG por programa (etapa 4) |
| Blocos → LOGO | 34 pares `.cp7`/`.txt` reais (etapa 7) |
| Compartilhados existentes | Importador de `.cp7` e script de migração (etapas 7 e 9) |
| Personagens e sorteio inicial | Teste E2E de fumaça (etapa 6) |
| Velocidades | Parâmetro de ops por frame mapeado de 25/5/1 (etapa 4) |

## Riscos transversais

- **Escopo crescendo**: cada etapa tem a tentação de "já que estou aqui". Regra: bugs do legado listados no inventário só são corrigidos em PR próprio, com o fixture atualizado de propósito.
- **Sem CI**: até existir, o revisor roda `pnpm test` e a validação manual. Recomendo abrir a issue de CI logo depois da etapa 1, quando já houver o que rodar.
- **Ritmo devagar**: as etapas G podem ficar abertas por muito tempo. Os PRs parciais listados nas etapas 6 e 7 existem para que a `main` continue publicável no meio delas, e para que Claude e Codex consigam retomar o contexto a partir dos documentos e dos testes, não da memória de quem parou.
