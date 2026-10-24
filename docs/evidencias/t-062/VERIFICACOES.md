# Fundação T-062 — verificações e racional

Base: T-061 integrada em `e7038fb`, PR #5. V6 aprovada por Márcio com “Aceito”. Esta entrega não implementa o motor novo, conversor ou API; prepara contratos e evidência real para as frentes seguintes.

## Resultado local

| Verificação | Resultado observado |
|---|---|
| Instalação limpa `npm ci --ignore-scripts` | 239 pacotes instalados, scripts desativados |
| `npm audit` completo | Zero vulnerabilidades, incluindo devDependencies |
| `npm audit signatures` | 239 assinaturas e 98 atestados verificados |
| `npm run check` | Tipos strict, core sem DOM, ESLint tipado/hooks/JSDoc, Prettier e Knip aprovados |
| `npm test` | 93 testes, cinco arquivos: 34 exemplos reais, patrimônio, semântica/seleção, contratos/schemas e fronteiras |
| `npm run build` | Entrada Vite/React gerada em dist/web, publicDir desativado |
| `node scripts/check-artifact.mjs` | Apenas HTML e bundles allowlisted; sem PHP/CP7/árvore legada |
| `npm run docs` | TypeDoc gerado em docs/reference, sem erros/avisos |
| Navegador em contexto novo | Entrada técnica renderiza; zero mensagens de erro/aviso e recursos apenas locais |
| `git diff --check` | Sem erro |

CI criada em `.github/workflows/check.yml`, com actions oficiais fixadas por SHA e permissão contents:read. Executa instalação/audit/check/test/build/docs/allowlist. Execução remota será validada no PR antes de integrar; o registro externo da task aponta o run e o SHA efetivamente integrado. CI remota aprovada no head `080ea99`, run [40058083365](https://github.com/mlpassos/pinteo_7/actions/runs/40058083365); PR #6 integrado em `bea82feb2e1119afc503cbee14bc91aba82d12cb`. Revisão dirigida do último diff sem novos achados, 63 testes afetados aprovados.

## Por que esta estrutura

Um pacote npm evita infraestrutura de monorepo. `web/` é a entrada temporária de desenvolvimento; `src/` contém contratos e bootstrap mínimo. O legado na raiz permanece disponível. O build não copia public/ nem a árvore histórica, o que impede publicar PHP, CP7 e dependências antigas por acidente. O aviso técnico da fundação não é a UI final, que seguirá a v6 aprovada na T-066.

Core puro tem compilação separada sem tipos DOM/Node, e imports por camada são fiscalizados no lint. Contratos públicos são interfaces/tipos e schemas reais, com fábrica validada de ID, sem funções de conversão vazias. O documento canônico preserva fonte LOGO e personagem, rejeita campos desconhecidos e limita bytes UTF-8. Reencode e assinatura PNG cabem à API, não são simulados pelo schema estrutural.

Os 129 arquivos preservados e as capturas integrais dos 34 exemplos permitem comparar o porte ao motor real. A VM interrompe laços síncronos de fato; não usa timeout de teste como alegação de cancelamento. A baseline é gzip determinístico, mas contém todas as operações. Os testes nunca a regeneram. Comportamentos e bugs conhecidos estão em legado.md; decisões de correção e seus motivos em DECISOES.md.

## Revisão e correções

Uma revisão técnica independente do lote encontrou imports por diretório contornando restrições de camada. A regra passou a cobrir diretório e descendentes; teste usa ESLint real para oito imports proibidos e um import puro permitido. Também se bloqueiam módulos externos no core, inclusive `fs` sem prefixo `node:`.

A inspeção de navegador encontrou a entrada fora de web/ com URL incorreta e depois montagem React duplicada por autorreferência do Fast Refresh. Alias `/src` resolve o caminho da entrada; separar componente e bootstrap eliminou a execução dupla. Confirmação em contexto de navegador novo sem erros/avisos; não se ocultou o warning.

A primeira execução Linux da CI (run 40057784330) encontrou diferenças trigonométricas da ordem de 1e-14 entre arquiteturas em três desenhos. A comparação passou a aceitar somente ruído numérico absoluto menor que 5e-10, mantendo estrutura, texto, ordem e tipos estritos. Quatro testes adicionais demonstram aceitação do ruído e rejeição de diferenças reais; as capturas originais não foram regeneradas. Também se proíbem eval, execução implícita de strings e Function no código novo.

## Limites

E2E de produto, comparação rasterizada, importação segura CP7, cancelamento do motor novo, API, interface final e publicação ainda são tarefas seguintes. Playwright está configurado, sem teste de fachada só para produzir verde. Nenhuma alteração de servidor, PHP, banco, conta, serviço pago ou deploy ocorreu. Não se declara a meta completa na fundação.
