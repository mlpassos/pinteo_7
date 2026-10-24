# T-069 — publicação do Pinte o 7

Publicação realizada em **24/10/2026, 17:04 UTC (14:04 em Belém)**, após autorização explícita de Márcio: “pode seguir pro deploy”, incluindo redirecionamento da URL antiga. URL final: **https://pinteo7.instadev.com.br/**.

## Identidade e escopo

- Código em produção: `85099a4cb5d7dcc3237a1be81849ce1f5d1f22d4`, tag **v1.0.0**, PR #12. Esta task registra a operação e ajusta os arquivos de deploy ao host; não recompila nem desloca a tag.
- Pacote: `pinteo7-v1.0.0-85099a4cb5d7.tar.gz`, 13.713.821 bytes, SHA256 `3b2a956ae8d6caead0f3e71432daaf16d71ad84d22c73a8c4b8b4c52dc5f2762`. Soma externa e 167 somas internas conferidas no Linux antes da instalação.
- DNS já apontava para o host correto; nenhuma alteração de DNS, plano, custo ou outro projeto foi necessária. Não foi usado snapshot pago ou reinicialização do servidor.
- Ubuntu 26.04.1 x86_64; 13 GiB disponíveis na inspeção; Caddy **2.11.7** existente. Node global **22.23.4** e npm global **10.9.9** preservados.
- Node isolado **24.22.1**, npm **11.19.1**, OpenSSL **3.5.9**, em `/opt/pinteo7/node`. Distribuição oficial Linux x64 conferida pelo SHA256 `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6` do arquivo oficial SHASUMS256.
- `npm ci --omit=dev --include=optional --ignore-scripts`: 26 pacotes instalados, audit runtime **zero vulnerabilidades reportadas**. Sharp nativo gerou PNG no Linux. O audit completo local também reportou zero na reconferência anterior ao deploy; os 100 testes específicos de importação/API/HTTP passaram.

## Configuração efetiva

Release imutável `/srv/pinteo7/releases/1.0.0-85099a4cb5d7`, symlink `/srv/pinteo7/current`. Runtime/código pertencem a root, sem escrita para o serviço. Conta de sistema `pinteo7`, sem login. Dados `/var/lib/pinteo7` e backups `/var/backups/pinteo7`, dono pinteo7, modo 0700. Configuração `/etc/pinteo7/api.env`, root:root 0600; nenhuma credencial consta do relatório.

`pinteo7.service` habilitado e ativo; Node escuta somente **127.0.0.1:5178**. `NoNewPrivileges=yes`, `ProtectSystem=strict`, permissões mínimas, dados separados do artefato, MemoryHigh 192 MiB e MemoryMax 320 MiB. O limite contém o processo dedicado sem alterar os limites do Caddy/site vizinho.

Caddy existente continua servindo o site principal. Adicionado apenas o import do site dedicado, root estático `current/dist/web`, proxy API local, limite de corpo e tratamento de headers conforme contrato. `/pinteo7` e `/pinteo7/*` no host principal retornam **301 para a entrada https://pinteo7.instadev.com.br/**. A regra precede as normalizações do site para evitar saltos extras em `/pinteo7/` ou `.html`. Subcaminhos antigos chegam à entrada nova; não há mapeamento fictício de PHP/CP7 ou reativação do legado.

Hashes SHA256 aplicados:

| Arquivo | SHA256 |
| --- | --- |
| `/etc/caddy/Caddyfile` | `ee28f1b841f901656150cc53638d9c25758cb4f4a2c0d4d4d3e2ba75e3a827f9` |
| `/etc/caddy/sites/pinteo7.caddy` | `0d8d871d5a4fa1eafa67e86b2ec4b0de026245ff6febff281cd7567b860fc1dc` |
| `/etc/systemd/system/pinteo7.service` | `9104d2134fc007ef77d2b4bee790fa7ec9bcd934b8567735e7c3db0aec6b6858` |
| `/etc/pinteo7/retirar-publicacao.sh` | `2dd721f967159f31c52e3cc2068df483c9d896dd2ef7267235cea6862e0f37ec` |

## Verificações reais

- `systemd-analyze verify` da unit passou. Emitiu avisos de opções CPUAccounting removidas em units XFS do sistema, fora desta task; nenhuma unit vizinha foi alterada.
- `caddy validate` global passou antes de cada reload. Aviso conhecido de redundância do override X-Forwarded-For mantido/documentado; nenhuma falha foi ocultada.
- Primeiro start e emissão inicial do certificado precisaram de retries transitórios de conexão/TLS, resolvidos automaticamente. Estado final: HTTP/2 **200**, `/api/health` **200**, certificado válido emitido por **Let's Encrypt YE1**, CN correto, válido de 24/10/2026 a 22/01/2027. Caddy gerencia HTTPS automático; renovação futura não foi simulada.
- Backup operacional anterior em `/var/backups/pinteo7-deploy/20261024T170424Z`, incluindo Caddy e estado dos serviços. HTML do site principal antes/depois comparado por `cmp`, idêntico: SHA256 `672de22759c3dee1a450144e22c9c0ff5cd71fc326b0dd50572f9d888f6ccea2`.
- Migração offline: **34 importados, zero reutilizados, 34 conferidos**. Não havia implantação/dados do Pinte o 7 nos caminhos dedicados; URL antiga respondia 404. Não se reivindica migração de shares de outro host não fornecido.
- Chrome real por Playwright, sem fakes/interceptação: abrir aplicação, editar LOGO, personagem Capivara, executar desenho, baixar PNG (4.045 bytes), criar compartilhamento público pela UI, listar na galeria, reabrir fonte/personagem/prévia sem autoexecutar e recarregar. Zero erros de JavaScript.
- Reinício de **somente** pinteo7.service: mesmo UUID/documento/personagem permaneceu acessível. API/Caddy habilitados/ativos; 5178 apenas em loopback.
- Em 390 px: sem overflow horizontal; executar/parar laço longo funcionou. Capturas desktop e móvel anexas. A revisão visual confirmou o layout aprovado.
- `/pinteo7`, `/pinteo7/`, `/pinteo7/index.php` e `/pinteo7/algum-artigo.html`: 301 direto para a URL nova. `/pinteo7-outro`: 404, fora do matcher.
- No subdomínio, `/save.php`, `/package.json`, `/dist/api/server/main.js`, `/.env`, `/data` e `/api/unknown`: **404**. Origin estrangeira na API: **403**. Arquivos históricos não foram publicados.
- Obra sintética `28de007d-290f-4f98-8c21-078e233118b8` removida pela CLI offline após backup e prova de persistência. Nenhuma obra de visitante removida. Galeria final: **34 exemplos**.

## Backup e recuperação

Backup anterior à migração preservado em `/var/backups/pinteo7/pre-1.0.0-20261024T170431Z`. Backup após smoke em `/var/backups/pinteo7/pos-publicacao-t069`; backup final sem amostra em `/var/backups/pinteo7/aceite-t069-20261024`. `diff -qr --exclude=.instance-lock` confirmou igualdade do backup final com os dados ativos.

Cópia externa ao host em `artifacts/t-069/backup-aceite-t069.tar.gz`, modo 0600, 605.731 bytes, SHA256 **64c84b9497c62322a2b4a1cd9dbd7597522a9c9069687061ac15a8b3999ba1e2**. Conferida nos dois extremos; arquivo contém 103 arquivos regulares, 34 documentos e caminhos seguros. Dados não foram versionados nem colocados no webroot.

Restauração ensaiada em diretório temporário isolado no macOS, com a API compilada: 34 documentos completos e 34 PNGs reabertos e confrontados com o backup por igualdade/hash. Diretório e processo de ensaio removidos; produção intacta. Não é ensaio de desastre do Linux nem prova de durabilidade sob falha elétrica. Não foi criada automação recorrente de backup.

Por ser a primeira implantação, não há versão anterior compatível para trocar o symlink. Está instalado `/etc/pinteo7/retirar-publicacao.sh` (root:root 0700), também versionado nesta pasta. `--check` passou no host: hashes da configuração atual/anterior e validação Caddy, sem alterar serviços. `--execute` faz novo backup, restaura o Caddy anterior e desabilita apenas a API, preservando todos os dados/release. Guarda por hash impede sobrescrever mudanças posteriores. Retirada real **não executada**. Para versões seguintes, usar troca atômica de symlink para código compatível, sempre preservando shares novos; nunca restaurar backup antigo como rollback automático de código.

## Evidências e limites

`smoke-browser.json`, `smoke-http.json`, `backup-verification.json`, `restore-verification.json`, `producao-desktop.png`, `producao-mobile.png` e script de retirada nesta pasta. Logs e pacote ficam no diretório ignorado `artifacts/t-069/`; credenciais e backup privado ficam fora do Git. Os scripts temporários de smoke foram usados somente para esta verificação.

A revisão técnica conferiu escopo da configuração, isolamento, somas, instalação sem scripts, persistência, backup/recuperação, redirecionamentos e ausência de exposição do legado/dados. Nenhum bloqueio encontrado. As verificações relatam o estado desta publicação, sem promessa de ausência absoluta de vulnerabilidades ou de renovação já ocorrida no futuro.
