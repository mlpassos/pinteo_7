# Revisão técnica dirigida — HTTP e harnesses T-067

24/10/2026. Revisão independente somente de `src/infrastructure/http/index.ts`, `tests/http/share-store.test.ts`, `scripts/copy-examples.mjs`, `scripts/test-api.mjs` e configuração Playwright. Não substitui a revisão final da integração/UI/migração; o export da migração estava em construção e não foi tratado como defeito.

## Achados corrigidos durante a revisão

1. **Envelope HTTP — bloqueante.** O cliente validava diretamente ShareEntry/SharePage, enquanto a API real devolve `{data: ...}`. Os mocks iniciais também omitiam o envelope e escondiam a falha. O coordenador corrigiu a validação para envelope strict e exposição apenas de `data`. Incluiu teste de create/list/load com `createApi`, `FileShareRepository` temporário e PNG gerado/reencodado por sharp reais. Correção relida e teste executado.
2. **Corpo pendente após recusa por cabeçalho — recurso.** A recusa de Content-Type/Content-Length ocorria antes da aquisição do reader, e o finally removia o timer sem abortar a requisição. A operação podia encerrar como Result deixando o corpo/requisição pendentes sem timeout. O coordenador adicionou `controller.abort()` no finally, antes de remover timer, incluindo todos os caminhos de saída. Teste dedicado observa AbortSignal encerrado após recusa de cabeçalho com corpo pendente. Correção relida e teste executado.

## Verificações restantes

- Endpoints são relativos e fixos; UUID é validado antes de integrar caminho. Resposta de load deve corresponder ao ID solicitado. Cursor opaco é limitado e escapado por URLSearchParams.
- `credentials: omit`, `redirect: error` e `cache: no-store`. O cliente não segue URL arbitrária recebida nem realiza fetch de prévia externa. Schemas strict também conferem que URL de prévia relativa corresponde ao ID.
- JSON exige Content-Type correto, UTF-8 válido e limite de256KiB, verificado pelo header quando presente e pela soma dos chunks efetivamente lidos. Excesso durante streaming cancela o reader; o finally agora aborta a requisição em todos os demais encerramentos.
- Timer de15s permanece durante fetch e leitura/decodificação da resposta. Sua duração exata em rede real não foi medida nesta revisão; verificou-se a ligação do AbortSignal e o encerramento em erro. Não se reivindica teste de tempo que não foi executado.
- Fonte/PNG são validados e limitados antes de preparar o POST. Falhas retornam Result em pt-BR; nenhuma atribuição altera documento ou desenho do chamador. Campos da resposta continuam dados validados, sem HTML executado.
- `copy-examples.mjs` aceita somente manifesto e34 pares program.json/PNG esperados, valida arquivos regulares não simbólicos/tamanho e copia para o artefato administrativo da API. Não coloca CP7/originais no frontend.
- `test-api.mjs` cria diretório próprio com mkdtemp fora do checkout; dados e backup inicial ficam dentro dele. Cleanup remove somente esse diretório e encerra somente a instância criada pelo harness. Configuração Playwright exige API nova (`reuseExistingServer:false`), evitando executar contra armazenamento persistente de outra sessão. A UI local pode reutilizar Vite quando configurada; CI não reutiliza.

## Resultado

Após as duas correções, `npm exec vitest -- run tests/http/share-store.test.ts`: **8 testes passaram**. Nenhum achado bloqueante pendente no escopo revisado. Não foram editados cliente, scripts, testes, dependências ou configurações pelo revisor; somente este parecer foi registrado. Checks globais, E2E reais e revisão final de integração ficam sob coordenação.

## Complemento: composição UI e prévia

Por delegação posterior, revisão somente leitura de main/App/preview/Stage/Gallery/Share. A composição cria a promessa de GET inicial fora do StrictMode, valida ID e não executa o LOGO recebido. A aplicação inicial consulta revisão/personagem atuais antes de substituir o rascunho; abertura pela galeria invalida a aplicação tardia ao fechar o diálogo. Fonte e Blob só são confirmados juntos após validação e leitura. Falhas de rede preservam documento/desenho. Stage libera renderer, assinaturas, observadores e URL de objeto; BFCache interrompe execução sem desmontar a árvore preservada. Exportação da prévia usa o Blob recebido e validado, sem executar o programa para reconstruí-la.

Foi encontrado um terceiro problema de recurso: `loadPreview` limitava bytes, porém não tinha timeout/AbortSignal e não encerrava o corpo ao recusar cabeçalhos. O autor corrigiu com AbortController, timer de10s cobrindo fetch/leitura e abort no finally, em sucesso ou falha. Foi relida somente essa alteração. Probe independente, em memória e sem alterar UI/testes, transpila o módulo real e fornece fetch/ReadableStream que respeitam AbortSignal, com relógio controlado: ao disparar o callback registrado para10000ms, a leitura PNG pendente rejeita, o sinal termina abortado e o timer é removido. Em resposta text/html recusada, a mesma instrumentação comprova abort do corpo pendente e remoção do timer sem dispará-lo. Não foi esperado timeout real de10s nem se atribui ao probe validação de rede real/browser.

Após a correção, nenhum bloqueio pendente no escopo dirigido da composição/prévia. E2E conjuntos e QA global são responsabilidade do coordenador; resultados informados por outras frentes não são apresentados aqui como execução deste revisor.
