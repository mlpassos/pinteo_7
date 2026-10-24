# Verificações — T-065

Execução local em 24/10/2026, macOS, Node 24.22.1/npm 11.19.1. Sem servidor remoto/deploy.

## Executadas

| Verificação | Resultado observado |
| --- | --- |
| `npm exec vitest -- run tests/api` | 53 testes aprovados em um arquivo; 671 ms na execução registrada. Diretórios temporários reais, removidos ao final. |
| `npm exec tsc -- --noEmit` | Exit 0. |
| `npm exec eslint -- src/server tests/api --max-warnings 0` | Exit 0, zero avisos. |
| `npm exec prettier -- --write src/server tests/api` | Arquivos formatados no escopo. |
| `npm run build:api` | TypeScript compilou o processo em `dist/api/server/main.js` e CLI em `dist/api/server/admin.js`. |
| `npm run docs` | TypeDoc gerado, sem warnings. |

Cobertura observada nos testes: criar/listar/abrir/PNG por socket HTTP e depois de reiniciar a instância; source textual HTML/LOGO inválido; JSON com pior expansão; limite UTF-8 exato; propriedades extras/versão/personagem; JSON malformado/UTF-8 inválido; Content-Type/compressão; corpo chunked real e Content-Length mentiroso; base64/PNG/tamanho/dimensões/bomba de pixels; reencode sem EXIF/bytes anexados; paginação sem repetição/staging privado; health; 405; origem 403; spoof de XFF; taxa 429 e expiração; UUID/cursor/traversal; quota concorrente; falha real de disco e EACCES com recuperação; JSON/resumo corrompidos; arquivo ausente/symlink; 500 sem vazamento/log privado; duas criações globais; fila de disco limitada; backup/restauração/remoção/trava/configuração.

## Processo compilado e CLI reais

Após `build:api`, uma execução Node auxiliar criou pasta temporária externa ao checkout, reservou porta local e iniciou `node dist/api/server/main.js` como processo filho. Criou obra por HTTP; tentou CLI com API ativa; encerrou por SIGTERM; iniciou outro processo com os mesmos dados; reabriu a obra; encerrou; executou `node dist/api/server/admin.js backup <destino-novo>` e `remove <uuid>`; conferiu JSON no backup e ausência da trava; removeu só os temporários da verificação.

Saída efetiva:

```json
{
  "create": 201,
  "realProcessRestart": 200,
  "adminBlockedWhileRunning": 1,
  "offlineBackup": 0,
  "offlineRemove": 0,
  "backupSourcePreserved": true,
  "staleLockPresent": false
}
```

## Limites da evidência

Não houve teste contra filesystem cheio fisicamente, falha elétrica, host público, Caddy, NAT escolar real ou concorrência distribuída. Falhas de IO foram verificadas por arquivo no lugar de diretório e perda real de permissão de escrita; quota e concorrência foram verificadas separadamente com arquivos reais. Trava permite uma instância, sem promessa de coordenação entre hosts.

A listagem verifica resumo e existência/tamanho de fonte/PNG; conteúdo JSON corrompido é diagnosticado ao abrir, sem omitir/apagar o original. Paginação não carrega todas as imagens/fontes, mas ainda percorre metadados da coleção; quota inicial e limite de fila tornam esse custo explícito.

Auditoria completa/dependências, checks globais, revisão técnica do lote e PR/CI são responsabilidade do coordenador, com seus respectivos registros. Esta evidência não afirma aprovação de testes ainda inexistentes de frontend/conversão/motor, nem autorização de produção.


## Validação global e revisão do coordenador

No lote `c4e09c6`, `npm run check` passou (tipos, core sem DOM, lint zero avisos, Prettier, Knip). `npm test` aprovou146 testes em seis arquivos, incluindo53 da API. Build web/API separados, TypeDoc sem avisos, allowlist do artefato web e git diff --check passaram. Audit completo zero e assinaturas estão em DEPENDENCIAS.md. A entrada web deste PR permanece a fundação; não é aceite da interface final.

Revisão dirigida examinou validação HTTP/socket, filesystem, quota, paginação e limites. Corrigidos: expansão do JSON ao escapar fonte, leitura de todas as imagens/fontes a cada página, fila de disco ilimitada e coerência de resumo obrigatório ao abrir. Não se alteraram originais nem se executou LOGO recebido. A semântica Node24 de cp com errorOnExist/force:false também foi conferida contra destino vazio já existente: recusado. Nenhum bloqueio técnico restante observado no lote.

CI remota/merge serão registrados na fila com SHA e run efetivos; este texto não presume seu resultado.
