# Caracterização do legado — T-062

Executada em 24/10/2026, Node 24.22.1, base de produto `e7038fb`. Este registro descreve comportamento observado, incluindo bugs; não aprova perpetuar falhas no porte. O coordenador registra checks globais e revisão no registro geral da T-062.

## Preservação e reprodução

`tests/fixtures/legacy/manifest.json` contém SHA-256, tamanho e caminho relativo dos 34 conjuntos TXT/CP7/PNG, 21 personagens PNG e seis fontes de comportamento (`logo`, `parser`, `turtle`, `init`, `pinteo7` e `index.html`). Cada arquivo também possui cópia byte a byte em `tests/fixtures/legacy/originals/`. Nenhum original foi movido, normalizado, sobrescrito ou removido. O teste compara os arquivos ativos ao manifesto e revalida os bytes das cópias. As fontes JS copiadas permitem localizar a versão de referência mesmo depois do porte; os testes nesta etapa exercitam os arquivos legados ativos.

`node scripts/legacy/inventory.mjs` **recria** cópias e manifesto: comando de manutenção explícito, não executado por CI/testes. `node scripts/legacy/characterize.mjs` **recria** a baseline de execução: mudança nesse arquivo exige revisar os resultados, pois regenerar não demonstra equivalência por si só. CI/testes somente leem e comparam.

O harness carrega e executa os arquivos originais `js/parser.js`, `js/logo.js`, `js/turtle.js` e `js/init.js`, sem portar nem substituir a semântica. Canvas e DOM mínimos observam operações/saída; `DelayTurtle` original agenda numa fila determinística. A semente aleatória é fixada em 12345. Coordenadas são as originais de canvas 500×500 (centro 250,250; eixo Y positivo para baixo, direção inicial 270°). `stroke` conserva caminho, cor e largura; `fill` conserva limpeza e cor. Não é comparação visual de pixels rasterizados nem valida antialiasing/browser.

O conjunto inteiro de ações de cada sessão roda dentro de **um `vm.runInContext` com timeout efetivo**, incluindo compilação/interpretação LOGO e drenagem de desenhos. Limite adicional: 100 mil operações e 100 mil callbacks por drenagem, 100 ações e 100 mil caracteres por fonte de teste. Geração dinâmica de JavaScript/WASM fica desativada. Os callbacks executam dentro da mesma VM; não se usa `Promise.race` ou timeout de Vitest para fingir interromper loop síncrono. O teste específico roda `repeat 1000000000 [make "x 1]` com 30 ms, exige timeout da VM e verifica execução independente posterior. O harness é ferramenta local de teste, não sandbox de segurança para código hostil em produção.

`tests/fixtures/legacy/examples.json.gz` registra **todas** as operações, estado final, saída HTML bruta (como texto), erro LOGO, exceções JS e agendamentos para cada um dos 34 TXT originais. Todos executaram e drenaram sem erro/exceção. A baseline completa tem aproximadamente 3,7 MB de JSON, preservado em gzip (~380 KB), sem descarte de dados; Node `gunzipSync` permite inspecionar o JSON. A compactação usa somente `node:zlib`. O teste reexecuta os 34 e compara cada captura integralmente. TXT é a fonte da caracterização; CP7 é preservado inerte e nunca entra no DOM. A futura T-066 deve analisar a estrutura CP7 com importação segura e resolver divergências TXT/CP7; esse aceite de importação não é reivindicado aqui.

## Matriz observada

| Aspecto | Evidência e comportamento atual | Consequência para o porte |
|---|---|---|
| Lento | UI envia `25,true`; `DelayTurtle` fraciona movimentos em passos de 1 e deixa personagem visível. `forward 1.5` anda 2, enquanto normal anda 1.5. | Preservar três velocidades; decidir correção explícita da geometria fracionária. |
| Normal | UI envia `5,false`; um comando por callback, personagem oculto pelo `DelayTurtle`. | Velocidade não deve redefinir geometria no contrato novo. |
| Rápido | UI envia `1,false`; até dez comandos por callback; personagem oculto. | Não tratar velocidade como nova linguagem. |
| Mesma velocidade | `run` mantém mesmo Logo e tartaruga; variáveis/procedimentos/posição/pena/cor/desenho/saída persistem. Histórico acumula fonte inteira. | Runner precisa de sessão, não recriação por execução sem decisão. |
| Troca de velocidade | Recria apenas `DelayTurtle`; volta centro, direção, pena e cor padrão. Variáveis/procedimentos, tinta anterior, saída e histórico persistem. | Efeito colateral legado registrado; não esconder como comportamento intencional. |
| `reset` LOGO | Enfileira limpeza e setup da tartaruga: centro, direção, pena preta largura1; mantém ambiente Logo e saída/histórico. | Diferenciar ambiente de execução e desenho. |
| `clearcanvas()` | Pinta canvas branco e esvazia saída; não muda posição/variáveis/procedimentos/histórico. | Não confundir função interna com botão inteiro. |
| Botão Limpar (`sacudirTela`) | Código ativo chama `clearcanvas(); setup();` e esvazia histórico; mantém fonte/blocos. Assim limpa também ambiente Logo e reinicia tartaruga. | Fonte deve ser preservada; documentar efeito no ambiente. |
| Parar | `stop()` sinaliza halt e enfileira `reset`; a fila com halt não executa esse reset. Desenho já feito/posição ficam; fila pendente não drena. | Não afirmar que Parar apaga desenho ou retorna centro. Não interrompe interpretação síncrona no legado. |
| Erro LOGO retornado | `init.run` mostra diálogo e chama `setup()`: variáveis/procedimentos/tartaruga reiniciam; saída e histórico permanecem. | Erro não pode apagar fonte; preservar sessão precisa de decisão explícita para erros. |
| Exceção JS | `print last [...]` e `print :variavelInexistente` lançam TypeError, sem diagnóstico pt-BR; a fila pode continuar marcada ativa. | Converter falhas conhecidas em diagnóstico seguro na T-063. |
| Seleção CLI | Função `Executar` real chama `run` com `cm.getValue()` completo; não chama `getSelection`. Harness adapta editor com `getSelection` que falha se consultado. | Não inventar execução de seleção que não existe na entrada ativa. |
| Seleção visual | `Executar` percorre todos `#codeblocks>li`, inclusive quando só um dos objetos está marcado no adaptador; não filtra seleção. | Teste da função original extraída; não é ensaio navegador de seleção CSS. |
| Criar procedimento | `adicionarCodigo`, ramo `funcao=="to"`, cria corpo vazio com “Arraste pra cá os blocos” e inicializa sortable. Não usa seleção; buscas na fonte ativa não encontram `selectable`, `ui-selected` ou `getSelection`. | A criação vigente é definir corpo e arrastar blocos. Converter seleção em procedimento não é requisito novo inferido. |

Seleção de personagem é funcionalidade separada, fora das ambiguidades de seleção de execução/procedimento. Nenhum depurador, passo a passo ou execução parcial foi acrescentado.

## Bugs dedicados

- `last`: indexa `b[b.length]`, devolvendo `undefined`. `print last [1 2 3]` lança TypeError ao consultar `.constructor`.
- `bitxor`: usa OR; `print bitxor 3 1` imprime `3`, enquanto XOR correto seria `2`.
- `greaterequalp`: alias registrado novamente para `lessequal?`; `greaterequal? 3 2` imprime true, mas `greaterequalp 3 2` imprime false. `lessequalp` não existe. As formas infixas `>=`/`<=` continuam corretas nos casos testados.
- Outras falhas observadas (geometria lenta fracionária, stop/reset, clean) não são corrigidas na fundação. `Turtle.clean` referencia `this.clean_` sem invocar; registrar e testar a decisão do porte antes de mudar semântica.

## Comandos e limites da evidência

Executados nesta frente: `node scripts/legacy/inventory.mjs`, `node scripts/legacy/characterize.mjs`, experimentos de sessão via `runLegacy` e observação de `Executar` via `observeExecutionSelection`. Testes Vitest residem em `tests/legacy/papert.test.ts` e `tests/legacy/ui-selection.test.ts`; o resultado integrado de lint/tipos/Vitest deve ser registrado pelo coordenador após instalar a fundação revisada.

Não foi instalada dependência nem criado backend/motor novo. Não foi executado PHP. Não houve publicação. Não foi feita comparação rasterizada dos PNG antigos nem importação CP7: ambos são trabalhos posteriores, preservando esta evidência original.

## Execução de cada exemplo

Tabela derivada das capturas completas; operação é uma chamada observada `stroke`/`fill`, não necessariamente um segmento visível (pena levantada ainda chama `stroke` no legado).

| ID original | Operações | Erro LOGO / exceção JS |
|---|---:|---|
| NomeDoAluno-02-07-2015-1435796325 | 1375 | nenhum / nenhuma |
| NomeDoAluno-02-08-2015-1438475611 | 1001 | nenhum / nenhuma |
| NomeDoAluno-02-08-2015-1438482509 | 1375 | nenhum / nenhuma |
| NomeDoAluno-02-08-2015-1438482584 | 80 | nenhum / nenhuma |
| NomeDoAluno-04-02-2016-1454642046 | 193 | nenhum / nenhuma |
| NomeDoAluno-04-02-2016-1454642081 | 1375 | nenhum / nenhuma |
| NomeDoAluno-05-07-2015-1436063124 | 80 | nenhum / nenhuma |
| NomeDoAluno-05-07-2015-1436067813 | 151 | nenhum / nenhuma |
| NomeDoAluno-05-07-2015-1436068286 | 151 | nenhum / nenhuma |
| NomeDoAluno-06-07-2015-1436151872 | 41 | nenhum / nenhuma |
| NomeDoAluno-06-07-2015-1436152188 | 49 | nenhum / nenhuma |
| NomeDoAluno-12-08-2015-1439431024 | 6 | nenhum / nenhuma |
| NomeDoAluno-13-09-2015-1442151872 | 810 | nenhum / nenhuma |
| NomeDoAluno-21-10-2015-1445484650 | 49 | nenhum / nenhuma |
| NomeDoAluno-24-10-2015-1445660804 | 543 | nenhum / nenhuma |
| NomeDoAluno-24-10-2015-1445661023 | 545 | nenhum / nenhuma |
| NomeDoAluno-24-10-2015-1445661299 | 554 | nenhum / nenhuma |
| NomeDoAluno-25-06-2015-1435205161 | 9 | nenhum / nenhuma |
| NomeDoAluno-26-06-2015-1435282479 | 193 | nenhum / nenhuma |
| NomeDoAluno-29-08-2015-1440899804 | 9 | nenhum / nenhuma |
| NomeDoAluno-29-08-2015-1440901170 | 286 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438221281 | 80 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438221299 | 80 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438221675 | 1001 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438226945 | 289 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438308881 | 367 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438309387 | 49 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438309701 | 49 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438310893 | 5329 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438310909 | 5329 | nenhum / nenhuma |
| NomeDoAluno-30-07-2015-1438311209 | 9 | nenhum / nenhuma |
| NomeDoAluno-31-08-2015-1441074535 | 1001 | nenhum / nenhuma |
| NomeDoAluno-31-08-2015-1441074676 | 49 | nenhum / nenhuma |
| NomeDoAluno-31-08-2015-1441074840 | 1001 | nenhum / nenhuma |

## Verificação desta frente concluída

- `npm exec vitest -- run tests/legacy`: **52 testes passaram em dois arquivos**, incluindo execução integral dos 34 exemplos, hashes das **129 cópias** (102 arquivos de exemplos +21 personagens +6 fontes), inventário sem órfãos, cabeçalhos PNG 128×128 RGBA, timeout síncrono efetivo, sessões, bugs e seleção da função ativa.
- `npm run typecheck`: passou, com `allowJs/checkJs` para os scripts e TypeScript strict nos testes.
- `npm exec eslint -- scripts/legacy tests/legacy`: passou sem avisos.
- `npm exec prettier -- --write scripts/legacy tests/legacy tests/fixtures/legacy/manifest.json`: aplicado ao código novo e manifesto; originais preservados excluídos da formatação.
- Duas gerações consecutivas de `examples.json.gz` produziram SHA-256 idêntico: `82a6e590b0aa176f249480edf09628b4f70ce458f39db76cda31f8e4d8b3acf3`. Testes **não** regeneram o baseline.

Os checks globais da fundação continuam sob responsabilidade do coordenador; esta seção atesta somente os comandos realmente executados nesta frente.
