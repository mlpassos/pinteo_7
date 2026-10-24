# Conversão Visual ↔ Código — T-064

Implementação de 24/10/2026, baseada no parser/motor T-063 integrado em `6d1ef995`. Este documento cobre o conversor puro; importação CP7 e relatório dos conjuntos possuem evidência própria da outra frente da T-064. UI integrada, publicação e produção não são reivindicadas aqui.

## API implementada

As funções `sourceToBlocks`, `editBlocks` e `blocksToSource` são exportadas por `src/core/program/index.ts` e satisfazem a porta `ConversionService` existente. Não houve mudança de tipos de programa nem adição de dependências.

- `sourceToBlocks(source, revision)`: analisa sem executar LOGO; retorna uma projeção somente se **todas** as instruções e argumentos couberem no modelo visual. Falha inclui código, mensagem em pt-BR e span UTF-16 quando disponível. A fonte recebida permanece canônica, incluindo espaços, caixa, comentários e terminadores de linha.
- `blocksToSource(projection)`: valida o vínculo árvore/comentários/fonte e retorna `originalSource` exatamente. Não reserializa desnecessariamente o documento.
- `editBlocks(projection, action)`: valida runtime, identidades, destino, invariantes e fonte; cria patches locais; reanalisa o resultado; confronta a árvore pretendida e o conjunto integral de comentários. Somente então devolve nova projeção com IDs preservados, spans/comentários atualizados e `sourceRevision + 1`. Falha não altera fonte, árvore ou ação recebida.

O consumidor deve comparar `projection.sourceRevision` à revisão atual do documento antes de editar. Uma função pura sem o documento atual não pode descobrir que o chamador reteve uma projeção de uma revisão anterior. A UI já possui essa guarda; o conversor também rejeita fonte/árvore/comentários incoerentes no envelope recebido. Spans são reconstruídos da análise da fonte e não usados como autoridade externa para cortar texto.

## Subconjunto completo da paleta

As 19 opções correspondem a 15 instruções visuais e quatro operadores de valor. Existem oito variantes discriminadas de Block no contrato, algumas cobrindo vários comandos:

| Modelo | Instruções/forma |
|---|---|
| move | forward, backward, left, right, setx, sety com um Value |
| position | setxy com dois Values |
| pen | penup, pendown, reset sem argumentos |
| color | RGB literal de três inteiros entre0 e255 |
| repeat | contador Value e corpo em colchetes |
| make | nome literal de símbolo e Value |
| define/call | procedimento sem parâmetros e chamada sem argumentos |
| Value.operator | sum, difference, product, divide com exatamente dois Values |

Aliases compatíveis (`fd`, `fw`, `bk`, `back`, `rt`, `lt`, `pu`, `pd`, `colour`, `add`, `sub`, `mul`, `div`) e infixos suportados são reconhecidos pelo catálogo do motor. A projeção conserva o texto original do alias. Operadores aninhados, precedência, variáveis e números negativos são projetados. Geração de texto após editar usa expressões prefixas parentizadas quando necessário, evitando alterar precedência. Números finitos em notação exponencial JavaScript são escritos em decimal aceito pelo tokenizer, inclusive extremos e zero negativo.

Procedimento sem definição no documento pode ser chamado: a sessão do motor pode já conter sua definição. Isso também permite excluir uma definição deixando a chamada visível, com eventual diagnóstico do motor ao executar. O bloco continua sendo uma chamada dedicada sem argumentos, não um bloco genérico de código. Comandos/primitivas/constants registrados sem equivalente visual nunca são tratados como chamadas arbitrárias. Procedimentos parametrizados, argumentos avulsos, operadores soltos na raiz e formas incompatíveis recusam a projeção inteira.

Exemplos recusados: `forward random 100`, condicionais, `print`, `setpos`, cor dinâmica/fracionária, procedimento com parâmetros, argumento lista em forward e sintaxe incompleta. Não existe execução para decidir representabilidade, conversão parcial ou alteração silenciosa da CLI.

## Edição de fonte e comentários

Alternância sem edição é byte-exata. Durante uma edição:

- Substituição de campo preserva alias, espaços, caixa e comentários dos demais tokens. Valores numéricos/variáveis parentizados podem ser editados mesmo com comentários dentro dos parênteses; a folha lexical é localizada sem confundir números/nomes escritos no comentário. Folhas de operadores são atualizadas recursivamente. Trocar operador prefixo também preserva comentários entre operandos.
- Um movimento transfere o trecho da instrução e seus comentários líderes/finais associados. Corpos internos e comentários dentro da própria instrução seguem no trecho original. O resto da fonte continua intacto; separadores locais impedem que um comentário engula o comando inserido.
- Exclusão mantém comentários adjacentes e transforma os comentários internos removidos junto da instrução em comentários soltos no mesmo ponto. Não apaga comentários por conveniência.
- Alterar a forma de uma expressão/container com comentário interno sem associação inequívoca é recusado com `AMBIGUOUS_COMMENT_EDIT`, localizado. Isso não bloqueia editar outras folhas, irmãos ou campos do mesmo programa. Substituição integral sem comentário interno é permitida.

Política de associação: comentário na mesma linha após uma instrução pertence a ela; linhas de comentário imediatamente anteriores pertencem à próxima instrução do corpo; uma linha vazia separa comentário de programa. Comentários soltos em corpo pertencem ao contexto do corpo. A política é determinística e a preservação final é conferida por texto e multiplicidade, inclusive comentários duplicados. Os offsets e as âncoras da projeção devolvida correspondem à fonte nova, permitindo encadear edições sem remendar metadados no chamador.

`BodyTarget.index` aponta para o encaixe na árvore **antes** da remoção. Movimento no mesmo corpo ajusta o índice uma única vez quando a origem está antes do destino; encaixes imediatamente antes/depois da própria peça são no-op de fonte. Mover ancestral para descendente, usar folha como corpo, repetir IDs ou mudar o ID de replace falha atomicamente.

## Evidência executada

91 testes de conversão em três arquivos passaram, incluindo os **34 TXT preservados**, todos integralmente representáveis pelo subconjunto atual. Os 34 alternam com fonte idêntica; testes semânticos externos ao conversor comparam programas gerados a referência escrita manualmente, ao motor e ao harness Papert. Isso não afirma que qualquer LOGO possa virar blocos, nem substitui a análise de divergências CP7/TXT da outra frente.

Casos adicionais: CRLF, aliases/infixos, quatro operadores, definição/chamada, comentários em cabeçalho/RGB/expressão/fim/adjacência, movimento dentro/entre corpos, exclusão, revisão e offsets após três edições encadeadas, dados runtime inválidos, IDs/ciclos, DAG de expressão compartilhado, profundidade, fonte excessiva, revisão máxima e mutação posterior da ação. Um spy no interpretador falha se o caminho de conversão tentar executá-lo.

Executados nesta frente: `npm exec vitest -- run tests/conversion`, `npm run typecheck`, ESLint e Prettier dos arquivos afetados. A regressão de nome `.forma` também tem teste comparado ao legado em `tests/motor/language.test.ts`. Checks globais finais, revisão independente, SHA e integração são registrados pelo coordenador após consolidar importador/conversor. Nenhum commit/push foi feito por esta frente no índice compartilhado.
