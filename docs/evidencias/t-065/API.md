# API local de compartilhamento — T-065

Implementação de 24/10/2026. Uma instância Node, sem PHP, login ou banco. A API não serve arquivos estáticos nem executa a fonte LOGO recebida: até um rascunho sintaticamente inválido pode ser compartilhado. HTML dentro da fonte continua texto JSON; nunca é renderizado pelo servidor.

## Executar localmente

Defina as variáveis e rode `npm run dev:api`. Para o artefato transpilado, rode `npm run build:api` e `node dist/api/server/main.js`. Diretório corrente deve ser o checkout/release.

| Variável | Valor e validação |
| --- | --- |
| `PINTEO7_DATA_DIR` | Obrigatória; diretório absoluto fora do checkout/webroot. Links ancestrais são resolvidos antes de verificar contenção física. |
| `PINTEO7_PUBLIC_ORIGIN` | Obrigatória; origem HTTP(S), sem credenciais, caminho, query ou fragmento. Normalizada por URL; barra final é aceita. Exemplo local: `http://127.0.0.1:5177`. |
| `PORT` | Inteiro 1–65535; padrão 5178. Bind fixo `127.0.0.1`. |
| `PINTEO7_QUOTA_BYTES` | Inteiro positivo; padrão 262144000 (250 MiB). Não remove obras automaticamente. |
| `PINTEO7_TRUST_LOCAL_PROXY` | `false` por padrão. `true` só permite `X-Forwarded-For` se o socket imediato for `127.0.0.1` ou `::1`; header deve conter exatamente um IP. |

Exemplo de diretório de dados local: uma pasta privada fora do repositório, informada explicitamente pelo operador. Não colocar JSON, PNG compartilhados, backups ou `.env` em `public/`, `dist/web/` ou na árvore servida pelo proxy.

O bootstrap cria diretório com modo 0700 e arquivos com 0600. `.instance-lock`, criado com exclusão, impede duas instâncias e administração durante a execução. Encerramento por SIGINT/SIGTERM libera a trava. Após queda abrupta, verificar o PID gravado e confirmar que o processo morreu antes de remover a trava manualmente. Nunca remover a trava de um processo ativo.

## Rotas

| Método | Caminho | Resultado |
| --- | --- | --- |
| GET | `/api/health` | 200 `{status:"ok"}` sem caminhos/configuração. |
| POST | `/api/v1/shares` | Corpo `{program:{formatVersion:1,source,characterId},pngBase64}`; 201 `{data:ShareEntry}` e `Location` do recurso. |
| GET | `/api/v1/shares?limit=20&cursor=…` | 200 `{data:{items,nextCursor}}`; resumos sem programas. `limit` 1–50; cursor opaco. |
| GET | `/api/v1/shares/:id` | 200 `{data:ShareEntry}` validado. |
| GET | `/api/v1/shares/:id/preview.png` | PNG reencodado, `Content-Type: image/png` e `X-Content-Type-Options: nosniff`. |

Não há endpoints públicos de alteração, remoção ou administração. Métodos diferentes dos registrados retornam 405 com `Allow`; URLs desconhecidas retornam 404. Não há preflight entre origens: a aplicação usa same-origin. Origem diferente da configurada, incluindo `Origin: null`, recebe 403 `INVALID_ORIGIN`, sem liberação CORS. Sem header Origin, clientes locais/CLI continuam permitidos sob os mesmos limites. Nunca são habilitadas credenciais CORS.

Fonte da validação compartilhada: `src/shared/index.ts`. Schemas estritos recusam propriedades desconhecidas, versão diferente de 1 e personagem fora dos 21 IDs. UUID é gerado no servidor e validado antes de qualquer composição de caminho. Cursor usa base64url canônico de uma chave data/UUID validada e limitada; não é caminho, segredo nem autorização.

## Limites e erros

| Limite | Aplicação |
| --- | --- |
| Corpo JSON 3 MiB | Conta bytes do stream antes de JSON.parse, mesmo sem Content-Length ou com header mentiroso. Só `application/json`, sem compressão. UTF-8 inválido é recusado. |
| Fonte 20 KiB UTF-8 | Não confunde caracteres com bytes. Sem validação sintática/executar LOGO. |
| PNG decodificado 2 MiB | Limite antes/depois do decode e novamente no PNG reencodado. Só bytes inline base64; nenhuma URL remota é carregada. |
| Dimensões até 2048×2048 | Assinatura PNG, metadata, limite de pixels no decoder Sharp e reencode completo. Metadados e bytes anexados não são copiados. Saída PNG estática. |
| Criações simultâneas 2 | Reserva antes de ler o corpo; excedentes retornam 503, sem fila de imagens. Liberação em `finally`. |
| Escrita 5/minuto/IP | Conta tentativas, inclusive inválidas. Janela fixa; mapa de até 10000 IPs com expiração. Header não substitui o IP real sem confiança explícita e socket local. |
| Operações de disco 32 | Uma operação ativa e até 31 aguardando por instância. Excedentes 503 `STORAGE_BUSY`; sem fila infinita. |
| HTTP local | Até 128 conexões, headers até 16 KiB, deadline de headers 10 s/corpo 15 s, keepalive 5 s. |

Envelope de erro: `{error:{code,message}}`, mensagem em pt-BR, sem stack/caminhos/código do usuário. 400: campos/envelope, ID, cursor ou JSON inválidos; 403: origem; 404: inexistente; 405: método; 413: bytes; 415: mídia/compressão; 422: documento/PNG inválido; 429: taxa; 503: quota/ocupação/disco/corrupção; 500: falha inesperada. Taxa retorna `Retry-After: 60`; ocupação retorna `Retry-After: 1`.

O Node não registra conteúdo de fontes, PNG, headers ou exceções. Falha inesperada na fronteira Hono registra apenas o código `UNEXPECTED`; o adaptador de socket também tem resposta sanitizada.

## Armazenamento, backup e remoção

Cada UUID recebe `program.json`, `summary.json` (resumo privado para paginação) e `preview.png`. A transação escreve os três em `.staging-<uuid>`, sincroniza o conteúdo dos arquivos e publica com um único rename no mesmo filesystem. Só o diretório UUID completo fica visível. Erros limpam somente o staging criado pela própria transação. Resíduos de queda não são apagados automaticamente, continuam invisíveis e contam na quota.

`summary.json` evita carregar fonte e PNG de todas as obras na listagem. Cada página percorre metadados, verifica existência/tamanho/tipo regular dos arquivos e retém no máximo `limit+1` resumos. Corrupção do resumo/arquivo ausente gera erro; corrupção interna da fonte é diagnosticada ao abrir. A paginação continua O(n) em diretórios, adequada à quota inicial; não há índice mutável global.

A quota contabiliza arquivos reais, incluindo resíduos, resumo e trava. Verificação e publicação são serializadas: criações concorrentes não podem excedê-la por corrida. JSON persistido aceita até `6*20480+4096` bytes para cobrir escapes JSON do limite UTF-8 sem produzir uma obra que depois não possa ser reaberta.

Operação administrativa exige acesso ao host como usuário dono dos dados e API parada (a trava é exigida pela CLI). Use `npm run admin -- remove <UUID>` ou `npm run admin -- backup <diretório-absoluto-novo>`, com as mesmas variáveis. Remoção faz rename para um diretório invisível antes da exclusão; nunca recebe caminho livre. Backup falha se o destino existir ou estiver dentro/contiver os dados; não sobrescreve cópias anteriores e não copia `.instance-lock`.

Política de operação: antes de upgrade/restauração/remoção administrativa, parar a API e produzir backup novo; manter ao menos uma cópia íntegra externa ao host e uma anterior à intervenção, com acesso restrito. Confirmar hashes/arquivos e testar abertura numa pasta isolada. O operador define retenção conforme espaço confirmado em T-069, sem apagar obras para abrir capacidade. Backup parcial é identificado como falho e não substitui a cópia anterior.

Restauração: parar a API; preservar dados atuais; restaurar a cópia para pasta privada nova fora da release; conferir `program.json`/`summary.json`/PNG e permissões; apontar `PINTEO7_DATA_DIR` para a cópia; iniciar e testar health/lista/abertura/PNG. Rollback de código não deve trocar nem apagar os dados. A T-069 prepara comandos de serviço/proxy e verifica espaço, backup externo e go de produção.

Atomicidade de publicação protege contra arquivos parciais durante falha de processo/IO; não equivale a replicação nem garante persistência de metadados do filesystem sob perda elétrica. Backup continua necessário. Migração dos exemplos antigos/CP7 é T-068: nenhum PHP/HTML legado é importado implicitamente pela API.
