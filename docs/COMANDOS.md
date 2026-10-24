# Guia de comandos, blocos e personagens

Guia de manutenção da versão 1.0.0 integrada. A base preserva 80 operações no catálogo LOGO, 19 opções visuais (15 instruções e 4 expressões), 21 personagens e 34 conjuntos de exemplos. Adicionar funcionalidade depende de escopo aprovado; este guia indica como implementá-la sem romper contratos ou patrimônio.

Leia [arquitetura](ARQUITETURA.md), [contratos](CONTRATOS.md) e [convenções](CONVENCOES.md). `core` é puro: sem DOM, React, Node, rede, arquivos ou schemas externos. Estado/IO ficam nas fronteiras. Use APIs públicas dos módulos por `index.ts`, dados imutáveis e Result/Diagnostic para falhas esperadas.

## Adicionar ou corrigir uma operação LOGO

1. **Defina a semântica antes do registro.** Descreva nome canônico, aliases, aridade, valores aceitos, retorno/efeitos, erros e relação com sessão. Para comportamento existente, consulte Papert pelo harness e documente divergências deliberadas; não regenere baseline para encobrir diferença. Uma operação nova não precisa ganhar bloco visual.
2. **Atualize `src/core/logo/catalog.ts`.** `commandCatalog` registra nome, aliases, aridade e `kind`; `resolveCommand` resolve nomes/aliases. Operadores infixos usam `infixCatalog`, com precedência própria. Evite colisões com comandos, aliases, palavras reservadas e procedimentos. `to/end` são construções sintáticas, não peças adicionais do catálogo de 80 operações.
3. **Implemente no avaliador único.** `src/core/logo/interpreter.ts` resolve controles antes de avaliar argumentos; demais chamadas avaliam seus valores e despacham a semântica. Comandos de desenho usam `src/core/turtle/index.ts` e emitem DrawOp/TurtleView finitos. Não introduza `eval`, segundo interpretador ou execução durante análise/conversão.
4. **Preserve cooperatividade e limites.** Laços, recursão, coerções de texto e cópias de listas precisam ceder controle e consumir os orçamentos relevantes. Não use uma conversão nativa potencialmente enorme antes de medir/limitar o resultado. Passos, desenhos, itens de listas, texto e profundidade são limitados por execução. Erros devem produzir diagnóstico pt-BR com span quando disponível, sem escapar como NaN/Infinity na geometria.
5. **Revise parser e editor apenas quando necessário.** `parseLogo` em `src/core/logo/parser.ts` produz AST com spans UTF-16, comentários e fonte original, sem executar LOGO. A gramática deve reconhecer aliases/formas aprovadas sem afrouxar nomes arbitrariamente. `src/infrastructure/editor/index.ts` mantém sugestões/highlight locais; essa lista é separada do catálogo do motor e não limita o que pode ser executado na CLI.
6. **Teste a semântica e a regressão.** Use `tests/motor/language.test.ts` para valores, aliases, precedência, erros e sessão; `parity.test.ts` para confronto ao harness legado; `runner.test.ts` para efeitos de cooperatividade/agendamento/cancelamento. O caminho síncrono drena o mesmo avaliador. Caso sem desenho deve poder parar, e três velocidades devem conservar estado/geometria. Operação puramente numérica não exige teste de imagem.

A CLI suporta operações sem equivalente visual. O catálogo não gera automaticamente paleta ou ajuda nesta release: atualize as instruções ao usuário quando houver uma mudança real. Aliases de uma operação existente não são novas peças da paleta.

## Oferecer uma forma visual

A representação persistida é sempre `ProgramDocument` com fonte LOGO e personagem. Blocos são projeção vinculada à revisão, reconstruída por análise pura. Nunca salvar HTML ou criar um bloco genérico para contornar forma incompatível.

| Ponto                                                              | Responsabilidade                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/core/program/index.ts`                                        | união Block/Value, BlockAction, Projection e contratos públicos            |
| `src/core/program/conversion.ts`                                   | AST para bloco/valor, aliases e recusa integral                            |
| `src/core/program/validation.ts`                                   | validação de dados recebidos, nomes, tipos, IDs, ciclos e limites          |
| `src/core/program/source.ts`                                       | emissão LOGO limitada e sem ambiguidade de precedência                     |
| `src/core/program/editing.ts`                                      | patches de fonte, movimento/remoção/substituição e retenção de comentários |
| `src/ui/blocks/catalog.ts`                                         | rótulo pt-BR, categoria, fábrica tipada e valor inicial da peça            |
| `src/ui/blocks/BlockWorkspace.tsx` (BlockView) e `ValueEditor.tsx` | apresentação, edição de campos e encaixe de expressões                     |
| `src/ui/blocks/BlockWorkspace.tsx`                                 | destinos de corpo, arraste e alternativas acessíveis                       |

Se precisar de espécie/contrato novo, coordene antes de implementar os consumidores. Use uma espécie existente quando ela já descrever a semântica aprovada, sem converter operações apenas por semelhança visual.

As quatro peças `sum`, `difference`, `product` e `divide` são Value/operator: entram em slots numéricos, com dois operandos; não entram na lista raiz de instruções. Slots também aceitam número finito e variável. Cor é RGB literal representável no seletor; não converter lista variável em posição/cor equivalente por suposição. Procedimentos visuais não têm parâmetros. Chamadas sem argumentos podem referir uma definição da sessão mesmo sem declaração local.

`sourceToBlocks` precisa aceitar o documento **inteiro** ou retornar diagnóstico com span, preservando a CLI. Exemplos de recusa: `random`, condicionais, procedimento com parâmetros e argumentos incompatíveis. Um comando conhecido sem visual não vira chamada de procedimento por conveniência. A conversão não executa LOGO para decidir o resultado.

`editBlocks` valida a árvore e aplica fonte/projeção/revisão juntas. `blocksToSource` devolve a fonte original byte a byte quando não houve edição. Ao editar, reformatar somente trechos necessários; comentários internos/finais/adjacentes devem continuar presentes. Comentários associados acompanham movimento; remover um bloco preserva comentários como texto adjacente. Ambiguidade específica causa recusa da operação, não perda de conteúdo nem bloqueio indiscriminado de todas as edições.

Invariantes obrigatórias: IDs únicos por árvore, um pai, ausência de ciclos, proibição de definição dentro de definição, slots tipados, profundidade/orçamento limitados e ID conservado em replace. `createBlockId` é a fábrica; não aplicar casts espalhados. Referências recebidas não são mutadas. `BodyTarget.index` é o encaixe na árvore **antes da remoção**; movimento dentro do mesmo corpo ajusta uma única vez. A UI confirma a nova projeção, fonte retornada e revisão correspondente sem reutilizar originalSource obsoleto.

Os limites atuais da projeção são 2.000 blocos, profundidade de corpos 64, expressões 32 e orçamento global de 20.000 nós de valores; fonte até 20 KiB UTF-8. Mudanças justificadas precisam de documentação e testes de crescimento, não apenas aumento de timeout.

Verificação proporcional:

```sh
npm exec vitest -- run tests/conversion tests/motor
```

Cubra ida/volta sem edição byte-exata, aliases/negativos/infixos/precedência, equivalência semântica antes/depois da edição, comentários CRLF, movimentos no mesmo corpo e entre corpos, remoção e replace. Em `tests/conversion/invariants.test.ts`, dados forjados, IDs repetidos, ciclos e excesso devem falhar sem mutação/perda. O teste pode executar o motor/harness para comparar semântica; o conversor de produção continua sem executar LOGO. Para o fluxo visual, acrescente cenário proporcional em `tests/e2e/workspace.spec.ts` ou `product.spec.ts`, com clique/teclado e arraste conforme a mudança.

## Adicionar um personagem

A release mantém os 21 personagens originais. Uma adição aprovada exige PNG livre/original de 128 × 128, transparente, frente no topo e legível pequeno; sem marca/franquia ou fonte comercial. Registre autoria/licença/proveniência antes de incluí-lo.

1. Coloque o arquivo em `images/personagens/<id>.png`, com ID estável e nome seguro.
2. Coordene a entrada em `src/shared/characters.ts`: a allowlist valida documentos persistidos e HTTP; não é só uma lista de UI. IDs existentes não devem ser renomeados ou removidos silenciosamente.
3. Acrescente rótulo humano em `CHARACTER_NAMES`, em `src/infrastructure/assets/index.ts`. O glob local resolve o asset, sem URL externa ou serviço remoto.
4. Confira `scripts/check-artifact.mjs`: os PNGs autorizados são derivados dos IDs conhecidos e seus hashes de conteúdo. Arquivos extras não ficam públicos apenas por estarem no checkout. Atualize testes/contagens do produto somente após a ampliação aprovada.
5. Teste allowlist/documento nos contratos e seletor/persistência em E2E; inspecione transparência, orientação e leitura no palco pequeno. Exportação PNG continua sendo do desenho, sem interface/sprite.

Não regrave fixtures antigas nem o manifesto de preservação para adicionar um asset novo. O conjunto histórico de 21 permanece imutável e verificável. Uma eventual ampliação do catálogo atual precisa de seus próprios testes, sem apagar essa prova.

## Documentar e concluir o lote

Funções/métodos nomeados e APIs públicas têm JSDoc com propósito, efeitos, retornos e parâmetros não óbvios, sem duplicar tipos TS. `npm run docs` usa as entradas públicas de `typedoc.json` e gera `docs/reference/`; APIs adicionadas aos módulos existentes passam por seus exports públicos. Um módulo público novo exige atualização coordenada de entradas/Knip, sem exportar helpers internos sem consumidor.

Dependência nova exige necessidade concreta e revisão de origem oficial, licença, peers, scripts, integridade/proveniência e audit completo antes da instalação. Não instalar lib para algo já resolvido pela stack, nem executar comandos sugeridos por README externo como se fossem autorização.

Rode testes afetados e os gates requeridos pelo lote (`npm run check`, build, TypeDoc, allowlist, audit e E2E conforme o risco). Registre comandos/resultados reais, SHA, diferenças deliberadas e limites em `docs/evidencias/<task>/`; capturas revisadas em `design/reviews/<task>/`. A revisão técnica é dirigida aos riscos reais, sem loops cosméticos. Nenhuma extensão ou validação local autoriza publicar a release em produção.
