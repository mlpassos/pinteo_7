# Decisões técnicas — T-065

24/10/2026. Escopo local; produção não foi acessada nem alterada.

- Uma instância e arquivos privados. Hono 4.13.13, adaptador Node 2.1.5 e Sharp 0.35.5 seguem a seleção/revisão do coordenador, com scripts desativados. Nenhum ORM, autenticação ou serviço remoto.
- Fronteira de persistência própria `ShareRepository`, independente de HTTP e da porta `ShareStore` do frontend. `ShareService` valida e coordena; erros esperados usam Result. Exceções inesperadas são sanitizadas no HTTP.
- Corpo limitado por leitura real do stream, sem depender apenas do middleware que pode confiar em Content-Length. Duas reservas globais abrangem leitura/validação/imagem/escrita; não há fila de imagem ilimitada. Requests em excesso falham com 503, preservando fonte local do cliente para retry.
- Taxa usa o socket imediato. Proxy só é confiável com opt-in e peer loopback; um único `X-Forwarded-For` válido, sobrescrito pelo Caddy. Cabeçalhos arbitrários `Forwarded` e XFF externo não alteram a chave. Mesmo CORS aceito continua sujeito a todos os limites. Origem estrangeira recebe 403 explícito, adição necessária à tabela básica de erros do contrato.
- Transações de disco serializadas, no máximo 32 pendentes incluindo a ativa. Evita corrida de quota e fila GET ilimitada. Uma trava `wx` também impede processos/CLI simultâneos; trava residual exige inspeção humana após queda.
- Resumo separado (`summary.json`) publicado atomicamente junto com fonte e PNG. Evita ler os até 250 MiB de conteúdo em cada página; mantém apenas até 51 resumos na memória por listagem. Listagem continua percorrendo diretórios/metadados O(n); índice/cache persistente não foi antecipado.
- O teto de JSON persistido cobre pior expansão por escapes (6×fonte UTF-8 mais envelope). Um teto de 32 KiB aceitaria criação de rascunho de 20 KiB com caracteres de controle e quebraria sua reabertura; teste real impede regressão.
- PNG passa por assinatura, dimensões/pixels Sharp, decode e reencode completo sem copiar metadata. Bytes antes/depois são limitados. O servidor nunca resolve URLs de imagem e nunca executa programas LOGO ou HTML.
- Backup é offline por exclusão de instância, cria destino novo e exclui trava. Remoção é comando local por UUID; nenhum endpoint público administrativo. Backup e dados têm ciclo de vida separado das releases.
- Arquivos novos usam 0600 e diretórios 0700. Registro/arquivo simbólico é recusado, em vez de seguir caminhos. Dados devem ficar fora da árvore pública tanto no caminho lexical quanto na resolução física.
- Não houve alteração no escopo de produto: fonte preservada, publicação imutável, galeria e PNG. Políticas finais de retenção/espaço e Caddy/serviço serão verificadas na T-069, com go de produção próprio.
