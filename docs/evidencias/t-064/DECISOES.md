# Decisões do conversor — T-064

24/10/2026. Complementa CONVERSAO.md e os contratos existentes. Fonte LOGO continua sendo o documento canônico; não foi criado formato de blocos persistido nem bloco genérico.

## Patches locais e reanálise

A edição não usa uma segunda versão textual escondida em WeakMap, cache global ou metadado não serializável. A própria Projection contém a fonte atual e a árvore. Antes de editar ou serializar, o conversor reanalisa a fonte e confronta semântica, IDs e comentários. Após editar, reanalisa de novo com os IDs na ordem pretendida e verifica a equivalência estrutural integral. Dessa forma, a projeção pode atravessar a composição da UI sem perder um estado privado necessário à preservação.

IDs são determinísticos por ordem na primeira projeção (`b1`, `b2`, …); inserções recebem ID da fábrica central chamada pela UI/importador. Toda edição conserva identidades existentes e rejeita duplicação. Uma análise completa de uma nova revisão textual pode criar uma nova projeção; IDs não são um identificador persistido do programa.

A fonte de uma operação aceita já está pronta em `originalSource` e sua revisão é incrementada. `blocksToSource` não retorna uma fonte anterior por engano; valida e devolve a fonte nova exatamente. O consumidor continua responsável pela guarda da revisão atual do documento.

## Comentários e recusa específica

A política de associação por linha/adjacência evita inferir significado de linguagem natural. Movimentos levam comentários associados; exclusão conserva todos como texto, inclusive comentários internos do corpo removido. Folhas e nomes podem mudar sem reescrever comentários internos em parênteses. Mudança de espécie ou de estrutura com comentário interno sem destino inequívoco é recusada especificamente. Preferiu-se esse diagnóstico localizado a apagar o comentário ou bloquear toda edição de um programa comentado.

O conjunto de comentários é comparado como array de textos ordenado para conferir multiplicidade sem depender de delimitadores suscetíveis a colisão. Isso autoriza a reordenação explícita durante movimentos sem aceitar desaparecimento ou duplicação de comentários. Trechos intocados, inclusive CRLF e caixa/aliases, não são normalizados.

## Nomes de chamada e compatibilidade demonstrada

O coordenador aprovou manter chamadas sem argumento mesmo sem definição local: a sessão LOGO pode conter o procedimento e excluir uma definição não deve forçar exclusão de suas chamadas. Nomes são validados e comandos conhecidos sem equivalente visual são recusados. Isso mantém um bloco dedicado de chamada, com eventual erro legível do motor, em vez de um bloco de código arbitrário.

Durante a rodada foi demonstrada uma regressão do porte: `to .forma print 7 end .forma` executa no Papert original, mas o tokenizer novo havia perdido o ponto inicial. A correção localizada foi autorizada pelo coordenador. Parser, localizador de token e validador de nome de procedimento agora aceitam essa forma original. Variáveis e símbolos continuam exigindo letra inicial. Há teste comparado ao harness, sem regeneração de baseline nem alteração arbitrária de gramática.

## Limites e dados externos

- Fonte original UTF-8 até20KiB, pelo mesmo parser puro; rejeição rápida também por comprimento de string antes de analisar fonte excessiva.
- Até2.000 blocos e64 níveis de corpo. Expressões têm até32 níveis e orçamento global de20.000 nós durante validação de dados de ação/projeção. Um DAG compartilhado que cresceria exponencialmente é interrompido no mesmo orçamento.
- Identidades passam pela fábrica central; nomes têm até128 caracteres da gramática LOGO correspondente. Números são finitos; RGB são três inteiros0–255; índice e revisão são inteiros seguros. Revisão máxima serializa, mas não pode ser incrementada.
- Texto de comentários não excede cumulativamente o tamanho da fonte recebida antes de comparar metadados. Spans são reconstruídos do parser; dados externos não indicam diretamente onde apagar texto.
- Geração de texto tem orçamento incremental de20KiB antes de acumular grandes expressões/containers. Nenhuma dependência nova, eval, DOM, HTML ou execução de LOGO entra no conversor.

Limites recusam com Result/diagnóstico; falhas não devolvem projeções parciais. Árvores/valores são reconstruídos e a mutação posterior de uma ação JavaScript não altera o resultado já aceito. Validações de IDs, unicidade, um pai por bloco, ciclos, corpos, definição dentro de definição e replace conservando ID são aplicadas antes da confirmação.

## Escopo respeitado

Os testes preservam e usam os originais; não alteram fixtures para obter paridade. Importação segura de CP7, classificação de divergências e integração da UI possuem donos e evidências próprios. Esta frente não modificou dependências, lockfile, configuração, fila, infraestrutura de produção nem executou tarefas T-067 antecipadamente.
