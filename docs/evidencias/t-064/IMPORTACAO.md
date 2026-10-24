# Importação segura dos 34 conjuntos — T-064

24/10/2026. Originais e baseline da T-062 preservados integralmente. Esta frente prepara dados locais para a integração posterior da galeria/API; não acessa produção, não cria compartilhados pela API e não publica HTML/CP7.

## Resultado

- 34 trios TXT/CP7/PNG auditados, com os 102 arquivos ativos e as 102 cópias preservadas conferidos por tamanho, SHA-256 e igualdade dos bytes.
- 33 pares TXT/CP7 têm AST equivalente após normalizar aliases/infixos, retirar spans e interpretar palavras nuas dos slots CP7 como referências a variáveis.
- Um par diverge: `NomeDoAluno-13-09-2015-1442151872`. O CP7 tem `sum 2 2` solto em `body[4]`, ausente do TXT. A auditoria conserva essa expressão e a diferença concreta. O TXT caracterizado continua canônico, sem acrescentar um comando ausente nem inventar um bloco genérico.
- 34 documentos `ProgramDocument` versionados conservam exatamente o TXT original, incluindo espaços/comentários. Todos os recursos CLI permanecem texto; a importação não depende de converter integralmente o programa para blocos.
- 34 PNGs foram decodificados/reencodados sem metadados. Pixels, canais e dimensões dos derivados foram comparados aos originais; bytes/hashes de origem e destino são registrados separadamente.

Relatório individual: [manifesto-importacao.json](manifesto-importacao.json). Cada entrada contém três caminhos/hashes/tamanhos originais, destino/hash do documento e da prévia, hash da fonte, fonte CP7 extraída, variáveis nuas reconhecidas, operadores soltos, diferenças por instrução e resolução explícita.

## Destino preparado

`src/infrastructure/legacy-import/generated/` contém 69 arquivos: `manifest.json`, 34 `example-NN.program.json` e 34 `example-NN.png`. O catálogo usa somente IDs/títulos neutros (`example-01`, `Exemplo 01` etc.) e caminhos relativos desses derivados. Não divulga nomes de arquivos legados, datas, nome de aluno, CP7, estilos ou marcação.

Os trios não persistem qual personagem foi escolhido; cada documento adota explicitamente `tartaruga`, um ID permitido. Isso não tenta deduzir autoria, personagem ou novos metadados pessoais a partir de nomes/arquivos. O seletor continua livre para alterar o personagem ao abrir.

T-067/T-068 poderão consumir os documentos/fontes/PNGs pela allowlist pública ou importar pela API segura, que gerará seus próprios UUIDs e revalidará/reencodará os dados. A árvore inteira do repositório, arquivos originais e relatório privado não são diretórios publicáveis. Nesta task não foi criado seed público nem executada uma migração em servidor.

## CP7 é dado, não HTML da interface

`importLegacyCp7` usa tokenização e pilha próprias sobre um dialeto fechado. Não usa DOM, DOMParser, innerHTML, eval, navegação ou rede. A saída é estrutura de dados e texto LOGO, nunca HTML "sanitizado" para inserir na página. `auditLegacyPair` analisa esse LOGO e o TXT com o parser puro, sem chamar o motor.

O inventário real encontrou somente `li`, `div`, `span`, `ol`, `br`; 31 combinações de classes e atributos limitados de apresentação/dados. O leitor permite somente tokens de classes conhecidos e atributos observados. Atributos de dados são validados inclusive quando descartados, evitando que URLs/JS em metadados ignorados sejam aceitos silenciosamente. Duplicação, atributo sem aspas, handler, href/src, script/svg/iframe, DTD, comentário HTML, fechamento malformado e classes desconhecidas recusam o arquivo inteiro.

Estilos permitidos são apenas declarações inertes observadas: `position: relative`, `z-index: 0` e `background-color: rgb(r, g, b)` com componentes 0–255. São validados e descartados; CSS arbitrário, `url()`, `expression()` e posicionamento não observado são recusados. IDs `ui-id-N` e referências `ui-tooltip-N` também são validados e descartados. Entidades são decodificadas uma única vez por uma tabela finita/códigos Unicode válidos, sem expansão externa ou nova interpretação como marcação.

Corpos aceitam só peças `li`, e `ol` só pode ser corpo direto de peça `repeat`/definição. Texto fora de peça, corpo inesperado ou conteúdo desconhecido provoca diagnóstico sem resultado parcial. Campos de valor aceitam números, variáveis e aritmética delimitada; o parser confirma que representam uma única expressão. Palavras como `tamanho` em `data-amount`, `data-loops`, `data-value` e operandos tornam-se `:tamanho` no candidato CP7; essa política consta do relatório, sem alterar o TXT original.

Limites: 128 KiB UTF-8 por CP7, 5000 elementos, 64 níveis, 2048 caracteres por atributo, 1024 por expressão, além do limite de fonte/parser LOGO de 20 KiB. Os maiores originais têm cerca de 10 KiB. Erros retornam `CP7_REJECTED`, `CP7_LOGO_INVALID` ou diagnóstico da auditoria; nenhum trecho seguro é devolvido se o restante for recusado.

## Reproduzir sem regravar baseline

- `node scripts/legacy/import-examples.mjs --check` (também padrão sem argumentos): confere originais/ativos, reaudita os 34 pares, verifica arquivos/hash do relatório e compara pixels dos PNGs congelados. Não reencoda esperando bytes de compressão idênticos entre macOS/Linux/libvips e não escreve arquivos.
- `node scripts/legacy/import-examples.mjs --write`: geração de manutenção explícita; reencoda prévias e grava somente os derivados e relatório conhecidos. Usar apenas diante de alteração intencional, revisando o diff dos dados/hashes. Nunca modifica originais ou baseline da T-062.
- `npm exec vitest -- run tests/import`: 39 testes aprovados em 273 ms na execução local registrada. Inclui ataques, limites, recusa integral, preservação de TXT, hashes dos 102 originais/ativos, catálogo/destinos 34/34, relatório 33+1 e igualdade dos pixels originais/derivados. Testes só leem evidências, sem regenerá-las.
- TypeScript sem emissão, ESLint do escopo com zero avisos e Prettier passaram. Check global/CI e revisão integrada do lote ficam sob coordenação, junto ao conversor da T-064.

## Limites da comparação

AST equivalente não é uma prova universal de equivalência semântica de qualquer LOGO. A comparação é estrutural e não executa programas, portanto não confirma igualdade por imagem parecida nem corrige bugs com base num desenho. Os 34 TXT já têm caracterização separada contra Papert na T-063, e seus bytes permanecem a fonte canônica.

O dialeto é intencionalmente mais restrito que HTML de navegador e serve à migração conhecida, sem upload público de CP7 arbitrário. Conteúdo futuro fora do dialeto exige revisão explícita; não há fallback que copie HTML ou converta parcialmente um programa. A migração não apaga operadores/comentários da fonte canônica para tornar conversão visual mais fácil.
