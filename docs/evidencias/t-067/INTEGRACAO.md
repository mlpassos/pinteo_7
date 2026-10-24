# Integração dos serviços reais — T-067

Base `d1b483cf`, após T-063/064/065/066 integradas com CI aprovada. O coordenador implementa cliente HTTP, configuração/artefato e testes conjuntos; frentes com escopos distintos ligam UI e migração. Nenhuma operação acessa produção.

## Revisão da migração

A leitura dirigida do coordenador conferiu o catálogo fechado, documentos e PNGs revalidados, reserva dos 34 IDs, trava exclusiva, backup com comparação SHA-256 antes de journal/share, publicação individual por staging/rename e retomada sem sobrescrever. O repositório usa a mesma quota/transação para criação pública e importação; o método administrativo não vira endpoint HTTP.

Após rename sem confirmação no journal, a retomada confere documento/timestamp/pixels antes de confirmar hash; registros já confirmados usam o hash persistido. Exclusão administrativa não é revertida automaticamente. Resíduos contam na quota e ficam preservados. Não há promessa de atomicidade dos 34 itens nem de durabilidade sob falta de energia. Os dez testes novos exercitam estados de interrupção montados no disco; a suíte da API totaliza 63 testes aprovados pelo autor.

O build copia somente 69 derivados conhecidos para `dist/api/examples/`, sem CP7, originais ou nomes históricos. Eles ficam fora do webroot. A allowlist de nomes, arquivos regulares, ausência de symlinks e tamanho é conferida antes da cópia.

## Smoke compilado independente

O coordenador executou a CLI compilada em diretório temporário externo: primeira migração criou 34 obras; segunda criou zero e reutilizou 34, com destino novo de backup. Inicializou a API real em porta efêmera sobre esses dados e recebeu HTTP 200 com 34 resumos. Ao encerrar, a trava estava liberada; diretório e backups de teste foram removidos somente após registrar os resultados. Evidência: [cli-smoke.json](cli-smoke.json).

Esse teste confirma também a resolução dos exemplos pelo módulo compilado e sua cópia no artefato da API, sem depender da árvore fonte. Não substitui a verificação do pacote final da T-068.

## Cliente HTTP e preservação

Oito testes do cliente passaram, incluindo o caminho create/list/load pelo handler Hono, repositório e PNG reais. A revisão independente encontrou e corrigiu envelope HTTP e cancelamento de corpo após recusa por cabeçalho; detalhes em [REVISAO-HTTP.md](REVISAO-HTTP.md). Dados recebidos são validados e limitados antes de chegarem à UI. Falha retorna diagnóstico e não altera programa/desenho.

## Verificação de produto

E2E reais e revisão visual ainda em execução; registrar resultados finais antes da integração. O bootstrap já usa serviços reais. O protótipo anterior em 8080 permanece separado enquanto essa prova termina.

## Checks conjuntos locais

Na árvore com UI, cliente e migração reais, `npm run check` completo passou (tipos/core puro/lint/formato/Knip). Passaram 403 testes Vitest em 18 arquivos. A conferência dos 34 conjuntos, build web/API com cópia dos derivados, TypeDoc, allowlist e audit completo também passaram; nenhuma vulnerabilidade reportada. O bundle principal ficou em aproximadamente 408 KiB e o editor em chunk local separado, sem aviso de chunk grande.

Oito E2E reais passaram na frente UI antes do QA conjunto. A primeira rodada teve um teste que supunha a obra nova na primeira página; a API ordena por contrato e o teste foi corrigido para percorrer a paginação, sem alterar o servidor para agradar ao teste. A confirmação conjunta dos 24 cenários será registrada após a última correção de feedback/captura.


## Fechamento do QA conjunto

Os 24 E2E passaram em 24,1 s no Chromium local 153.0.8010.12, com um worker, sem retries/sleeps para obter aprovação. API real foi criada em dados temporários com 34 exemplos importados offline e encerrada ao final. Permanecem distintos os 16 cenários da interface com fakes identificados e os 8 cenários do produto com serviços reais.

Após o ajuste de feedback, formato dos arquivos afetados, build web e allowlist foram repetidos e passaram. As capturas finais da T-067 foram inspecionadas em desktop/celular; as capturas históricas da T-066 foram preservadas após a execução da suíte antiga. Os avisos de Node sobre NO_COLOR/FORCE_COLOR vêm do ambiente CLI e não foram suprimidos; cenários de console do navegador reportaram zero erros/avisos.

Smoke adicional do vídeo local: reprodução inicial avançou, metadados 1920×1080/duração 263,03s e track com 3 cues disponíveis, sem erro. Teste silenciado; não se alega escuta ou revisão integral do vídeo. Registro: video-smoke.json. A matriz docs/ACEITE.md reflete os resultados e mantém os limites físicos/assistivos não verificados.
