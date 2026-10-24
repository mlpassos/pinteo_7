# Pacote e operação candidata — T-068

Validação local em 24/10/2026. Esta evidência descreve um **pacote de revisão com árvore suja**, não uma release final nem publicação. O coordenador fará commit final e gerará o pacote limpo, registrando SHA/hash efetivos antes do pedido de go de produção. Nenhum SSH, comando de serviço remoto, DNS ou TLS público foi executado nesta frente.

## Implementação

`scripts/package-release.mjs` confere versão package/lock e árvore Git, recompila o SHA real, executa a allowlist de assets web e confere a lista exata da API. Copia só o runtime, dependências declaradas por lock (sem node_modules), licenças/atribuições aprovadas e documentos/configs de operação. Não executa instalação nem scripts externos.

A saída fica em `artifacts/`, fora do webroot: diretório revisável, `.tar.gz` e soma externa `.sha256`. `release-manifest.json` registra versão, commit completo, flag dirty, epoch e SHA-256/tamanho de cada payload. `SHA256SUMS` cobre payload e manifesto; a soma externa cobre todo o arquivo. USTAR tem ordem/modos/UID/GID/mtime fixos e não inclui links. O script recusa arquivos extras em saída antiga, sem fazer limpeza destrutiva.

A allowlist contém `dist/web`, API compilada e 34 exemplos privados de migração, package/lock/.npmrc, LICENSE/Papert, docs de licença/deploy e diretórios `licenses/`/`deploy/`. Não inclui PHP/CP7, dados, fontes comerciais, node_modules da máquina, testes, originais ou pesquisa histórica. Licenças foram preparadas pela frente própria, sem inventar autoria ou reescrever termos.

## Verificações efetivas

- `node --check scripts/package-release.mjs` e ESLint do script com zero avisos: aprovados.
- Execução sem parâmetro na árvore suja: recusada antes de compilar/empacotar, exit 1, mensagem exigindo commit revisado.
- Duas execuções consecutivas com `--allow-dirty`: build/allowlist aprovados, mesmo hash final no mesmo ambiente Node 24.22.1/npm 11.19.1. Esse parâmetro é somente para revisão local; ambos os nomes/manifestos dizem `working-tree`/`dirty: true`.
- Extração por ferramenta tar independente para pasta temporária: 168 arquivos; 166 hashes/tamanhos do payload e 167 somas internas conferidos por leitura dos bytes extraídos; nenhum arquivo proibido. Temporário removido ao final.

Identidade observada desse candidato local (não usar em produção):

```json
{
  "version": "1.0.0",
  "gitSha": "5f3c7c7e6449e20ba61ae57a9969a93e4fa35a79",
  "dirty": true,
  "payloadFiles": 166,
  "archive": "artifacts/pinteo7-v1.0.0-5f3c7c7e6449-working-tree.tar.gz",
  "sha256": "5b9d6f5fbc096034234328c4b8ce0a47968e9aa5c0c9fc9c6fffad30420c8a82",
  "bytes": 13713853,
  "reproducibleSameEnvironment": true,
  "tarEntries": 168,
  "manifestFilesChecked": 166,
  "internalChecksums": 167,
  "forbiddenFiles": 0
}
```

## Configurações e limites

Candidatos em `deploy/`: site Caddy isolado, unit systemd dedicada e exemplo de ambiente sem segredos. Guia completo em `docs/DEPLOY.md`, incluindo runtime isolado se o Node global for de outro site, diretórios privados preparados antes da primeira migração, instalação por lock/scripts OFF, backup novo, migração offline, troca atômica de symlink e rollback de código conservando os shares mais novos.

Caddy local **2.11.4** já estava instalado. `caddy adapt --config deploy/pinteo7.caddy --adapter caddyfile` passou. Aviso visível: redundância de `header_up X-Forwarded-For`; mantido como override explícito para garantir um IP único, sem ocultar aviso.

Um Caddy temporário em HTTP/loopback, portas efêmeras próprias, admin/TLS/persistência desligados, encaminhou para um servidor Node temporário. A requisição enviou XFF com dois IPs falsos, Forwarded e X-Forwarded-Host falsos. Resultado recebido no upstream:

```json
{
  "xff": "127.0.0.1",
  "forwarded": null,
  "xfh": null,
  "bodyOver3MiB": 413
}
```

Os processos/pastas desse teste foram encerrados/removidos; nenhuma prévia do produto ou configuração global foi interrompida. `systemd-analyze` não existe no ambiente macOS: a unit foi conferida contra a documentação oficial, sem alegar validação executável. Sintaxe/adaptação/configuração global, Node/path/porta/espaço, usuário operador real do alias `instadev`, backup externo, TLS e rollback efetivo dependem da inspeção/execução T-069 **depois do go**.

A revisão independente leu script/configs/guia e aprovou a correção de primeira instalação (preparar dados e pai de backup antes do primeiro start). Resultado separado em `REVISAO.md`. Esta frente não afirma aprovação de produção, nem substitui os checks/QA/auditoria globais do coordenador.
