# Revisão conjunta — T-064

Base: `6d1ef995`, com motor e API integrados. Importação separada no commit `59bb027`; conversor, preservação de fonte e correção de nomes com ponto inicial compõem o segundo lote.

Em 24/10/2026, a execução local passou em 379 testes Vitest de 14 arquivos, incluindo 91 testes de conversão e 39 de importação. Build web/API, TypeDoc e allowlist passaram. A conferência `node scripts/legacy/import-examples.mjs --check` confirmou 34 conjuntos, 33 equivalências estruturais e uma divergência explícita, sem regravar originais ou derivados. Esse comando passa a integrar a CI.

Tipos, lint e formato passaram. O primeiro check global apontou somente um export interno sem consumidor (`numberSource`). Torná-lo privado corrigiu o problema sem exceção no Knip; Knip e diff-check passaram após esse ajuste. Assim, todos os componentes do check estão aprovados. A alteração de visibilidade interna não muda execução nem serialização.

A inspeção do coordenador conferiu patches localizados, validação da fonte após cada ação, confronto com a árvore pretendida e preservação dos comentários. A revisão independente dirigida aprovou o lote sem achado bloqueante. Seus 91 testes passaram; 38 movimentos/exclusões em três fontes com aliases, comentários e corpos conservaram os comentários. Uma projeção forjada com 1000 comentários de 1024 caracteres e fonte vazia foi recusada em aproximadamente 0,14 ms, antes da materialização em JSON. Também foram conferidos o orçamento agregado de comentários e o multiset sem colisão por delimitador. Não se usa aprovação por preferência cosmética nem uma conversão parcial para alcançar o aceite.

A correção do lexer para nomes de procedimento como `.forma` foi comparada ao Papert legado em teste dedicado. Não amplia a gramática de variáveis ou símbolos. Importação não executa LOGO, não injeta CP7 no DOM e não publica os relatórios que contêm nomes de arquivos históricos.

A revisão não atesta o gate de revisão mais recente da interface; esse comportamento precisa de serviços reais na T-067. Ainda não é validação completa de produto: UI e serviços reais serão ligados na T-067. Nenhum servidor remoto foi inspecionado ou alterado.
