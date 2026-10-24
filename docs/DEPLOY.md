# Publicação e operação do Pinte o 7

Versão **1.0.0 publicada em 24/10/2026** após go explícito de Márcio na T-069. URL: **https://pinteo7.instadev.com.br/**. Código/tag `85099a4cb5d7`, sem reconstruir ou deslocar a tag. [Relatório e evidências reais](../design/reviews/t-069/RELATORIO.md). O restante do guia descreve procedimentos operacionais; exemplos candidatos devem sempre ser confrontados ao host antes de uma nova publicação.

## Estado instalado e recuperação

- Ubuntu 26.04.1 x86_64; Caddy 2.11.7 existente preservado. Node global 22.23.4 não alterado.
- Runtime dedicado `/opt/pinteo7/node/bin/node`: Node 24.22.1, npm 11.19.1, OpenSSL 3.5.9. Unit `pinteo7.service`, usuário sem login `pinteo7`, porta **127.0.0.1:5178**.
- Release ativa `/srv/pinteo7/releases/1.0.0-85099a4cb5d7`; `current` aponta para ela. Código root sem escrita para o serviço; `/var/lib/pinteo7` e backups privados, modo 0700.
- Caddy importa `/etc/caddy/sites/pinteo7.caddy`. O [fragmento legado](../deploy/redirect-legado.caddy) fica dentro do bloco principal antes das normalizações: `/pinteo7` e `/pinteo7/*` → **301 https://pinteo7.instadev.com.br/**, em um salto. O destino é a entrada nova; caminhos PHP/CP7 antigos não são reativados.
- Configuração anterior em `/var/backups/pinteo7-deploy/20261024T170424Z`; backups de dados em `/var/backups/pinteo7`. Cópia externa conferida em `artifacts/t-069/backup-aceite-t069.tar.gz` no workspace local, fora do Git/webroot. Não há rotina recorrente de backup criada nesta entrega.
- Por ser a primeira publicação, não existe release anterior para trocar o symlink. A retirada inicial está preparada em `/etc/pinteo7/retirar-publicacao.sh`: `sudo /etc/pinteo7/retirar-publicacao.sh --check` foi executado e passou. `--execute` retira a publicação após novo backup dos dados, restaura o Caddy anterior e desabilita somente a API, sem apagar releases/dados. Essa retirada efetiva **não foi executada**. Guardas de hash impedem sobrescrever mudanças posteriores do Caddy; se o host mudar, revisar o procedimento.
- A restauração do backup final foi testada em diretório temporário isolado no macOS, servindo e confrontando os 34 documentos e PNGs pela API compilada. Isso não equivale a um teste destrutivo de recuperação do servidor Linux.


## Artefato e identidade

Na árvore limpa, depois de verificações/revisão, executar localmente:

```sh
node scripts/package-release.mjs
```

O script recusa árvore suja, confere versão de package/lock, recompila o SHA real, verifica a allowlist web e a lista exata da API, e escreve em `artifacts/`. O nome contém versão e SHA do commit. O manifesto `release-manifest.json` registra versão, SHA completo, `dirty`, epoch do commit e SHA-256/tamanho de cada arquivo do payload. `SHA256SUMS` também cobre esse manifesto; a soma externa do `.tar.gz` cobre todo o arquivo, inclusive os próprios arquivos de conferência. Nenhum manifesto tenta conter o próprio hash recursivamente.

`--allow-dirty` serve somente à revisão local. Nesse caso o pacote e seu manifesto dizem `working-tree`/`dirty: true`; ele não é candidato final de produção. O SHA informado continua sendo o HEAD real, sem fingir que alterações locais foram commitadas. Depois do commit final, gerar novamente sem esse parâmetro e registrar hash/nome efetivos.

Allowlist do pacote: `dist/web`, `dist/api` (inclusive 34 exemplos administrativos), package/lock/.npmrc, licenças/atribuições aprovadas, configurações candidatas `deploy/` e este guia. Sem `node_modules` do macOS, dados, `.env` real, fonte comercial, PHP/CP7, originais, testes, protótipo ou documentação histórica. O pacote é de runtime: comandos npm de build/admin do repositório não são entradas de operação do pacote; no host usar os módulos JS já compilados.

USTAR usa ordem fixa, modo 0644, UID/GID zero e mtime do commit. Gzip não preserva relógio ou nome temporário. Mesmos bytes de build/avisos e mesma implementação Node/zlib produzem o mesmo arquivo; o manifesto permite comparar o conteúdo mesmo quando ferramentas/plataformas de compressão diferirem. Tar não inclui symlinks. Um diretório de saída preexistente com arquivos extras é recusado em vez de ser apagado automaticamente.

## Inspeção após o go

O alias `instadev` identifica uma conexão, não um nome de usuário confirmado. Somente após go, inspecionar identidade/permissões, distribuição, arquitetura, espaço/inodes, DNS/TLS, Caddy/systemd existentes, serviços/portas e caminhos de Node/npm. Registrar estado anterior e os sites vizinhos antes de qualquer mudança. Exemplos de leituras a adaptar ao operador real:

```sh
id
uname -a
df -h /srv /var/lib /var/backups
df -i /srv /var/lib /var/backups
command -v node npm caddy
node --version
npm --version
systemctl --version
systemctl status caddy --no-pager
ss -lntp
```

Node 24.22.1/npm 11.19.1 são candidatos verificados localmente, não uma afirmação sobre o host. Se o runtime global atende outro site ou não satisfaz os engines, preparar runtime isolado em `/opt/pinteo7/node/`, por distribuição oficial verificada e compatível com o host; ajustar `ExecStart`/PATH do Pinte o 7. Não atualizar Node global nem pacotes dos outros sites por rotina. Caminhos absolutos dos exemplos abaixo devem ser confirmados antes da execução.

## Caminhos e permissões candidatos

| Caminho | Responsabilidade |
| --- | --- |
| `/srv/pinteo7/releases/<versão>-<sha12>` | Código imutável de uma release; leitura para serviço/Caddy. |
| `/srv/pinteo7/current` | Symlink para release ativa. |
| `/var/lib/pinteo7` | Dados privados JSON/PNG/journal, usuário `pinteo7`, modo 0700. |
| `/var/backups/pinteo7` | Backups privados, acesso do usuário operacional de dados; nunca webroot. |
| `/etc/pinteo7/api.env` | Configuração root:root 0600, carregada pelo systemd. |
| `/etc/systemd/system/pinteo7.service` | Serviço dedicado, sem privilégios e sem interferir em outras units. |
| Arquivo de site Caddy a confirmar | Somente o host Pinte o 7; manter configuração global e sites existentes. |

Criar a conta de sistema `pinteo7` sem login somente se não existir, após confirmar ferramentas/conta no host. Não reutilizar conta de outro site. Código fica sem escrita para esse usuário; dados/backups têm o ciclo de vida separado. `StateDirectory` e `ReadWritePaths` da unit mantêm apenas os dados graváveis dentro do sandbox. A CLI offline de backup/migração roda fora dessa unit, como dono dos dados, com a API parada.

Na primeira instalação, preparar os dois diretórios privados **antes da migração**, pois o primeiro start da unit ainda não terá criado `StateDirectory` e o backup exige pai existente. Após confirmar/criar a conta e inspecionar se esses caminhos já existem, executar somente para diretórios novos:

```sh
sudo install -d -o pinteo7 -g pinteo7 -m 0700 /var/lib/pinteo7
sudo install -d -o pinteo7 -g pinteo7 -m 0700 /var/backups/pinteo7
```

Se já existirem, conferir conteúdo, proprietário e permissões antes de decidir qualquer ajuste; não reaplicar chown/chmod cegamente sobre dados antigos. Preparar `/etc/pinteo7` privado para root e a raiz de releases dedicada separadamente, sem alterar diretórios globais ou de sites vizinhos.

## Instalar uma release sem ativá-la

Transferir somente o arquivo final e sua soma, após conferir `dirty: false`, SHA/version e aprovação do pacote. Usar diretório de entrada privado. No host, conferir soma externa antes de extrair e somas internas antes de instalar dependências:

```sh
# Substituir pelos nomes EXATOS do pacote final e do manifesto aprovado.
P7_ARCHIVE=/caminho/privado/pinteo7-v1.0.0-SHA12.tar.gz
P7_RELEASE=/srv/pinteo7/releases/1.0.0-SHA12
cd "$(dirname "$P7_ARCHIVE")"
sha256sum -c "$(basename "$P7_ARCHIVE").sha256"
tar -tzf "$P7_ARCHIVE"
test ! -e "$P7_RELEASE"
sudo install -d -m 0755 /srv/pinteo7/releases
sudo install -d -o "$(id -un)" -g "$(id -gn)" -m 0755 "$P7_RELEASE"
# O id acima é do operador que executa no host, não o nome do alias SSH.
# Extrair como esse operador, sem herdar UID/GID ou permissões do arquivo:
tar --no-same-owner --no-same-permissions --strip-components=1 -xzf "$P7_ARCHIVE" -C "$P7_RELEASE"
cd "$P7_RELEASE"
sha256sum -c SHA256SUMS
```

Não extrair por cima de release anterior nem aceitar nomes/paths fora do manifesto. Confirmar que o diretório de destino existe, é novo e pertence ao operador real antes do tar. Dependências nativas precisam ser instaladas **no Linux do host**, por lock, com scripts desativados e optional dependencies habilitadas:

```sh
# Usar o PATH do runtime dedicado quando necessário.
npm ci --omit=dev --include=optional --ignore-scripts
node --input-type=module -e 'import sharp from "sharp"; const png = await sharp({create:{width:1,height:1,channels:4,background:"#ffffff"}}).png().toBuffer(); if (png.length === 0) throw new Error("PNG indisponível"); console.log("Sharp nativo: PNG OK");'
```

Falha de binário Sharp/runtime não autoriza scripts de instalação desconhecidos; revisar causa/origem/integridade antes de qualquer exceção. Após instalação e smoke, deixar código/dependências sem escrita para o serviço (por exemplo root:root; diretórios 0755, arquivos 0644). Não alterar permissões de dados/backups nem de outros sites com um chmod/chown sobre `/srv` ou `/var` inteiros.

## Configurar e validar sem substituir o site vizinho

Arquivos candidatos: `deploy/api.env.example`, `deploy/pinteo7.service`, `deploy/pinteo7.caddy`. Confirmar Node absoluto, porta livre 5178 e espaço/backup. Configuração da aplicação usa origem `https://pinteo7.instadev.com.br`, dados `/var/lib/pinteo7`, quota inicial 250 MiB e confiança em proxy local explicitamente ligada.

Antes de alterar configuração global, fazer cópias privadas datadas da unit/configuração atuais, incluindo symlink ativo e configuração completa do Caddy. Instalar o bloco do Pinte o 7 como arquivo de site isolado e adicionar apenas o import necessário à configuração existente. Nunca substituir o Caddyfile global pelo arquivo de um único site.

Após preparar os candidatos, validar **a configuração global resultante**, sem iniciar outra instância de Caddy:

```sh
sudo systemd-analyze verify /etc/systemd/system/pinteo7.service
sudo caddy validate --config /caminho/real/Caddyfile --adapter caddyfile
sudo systemctl daemon-reload
```

Só depois das validações recarregar o Caddy existente pelo mecanismo operacional do host. A configuração separa `/api` e `/api/*` do conteúdo estático, limita corpo a 3145728 bytes e encaminha para `127.0.0.1:5178`. O único root estático é `current/dist/web`; `dist/api`, package/lock, licenças, dados e backups ficam fora dele. Como a aplicação usa `/?share=<uuid>`, não há necessidade de servir index.html para qualquer caminho desconhecido.

X-Forwarded-For é sobrescrito pelo peer do Caddy, e `Forwarded`/X-Forwarded-Host recebidos são removidos. Isso evita confiar em uma cadeia arbitrária enviada pelo cliente. Caddy local 2.11.4 emite aviso de redundância desse `header_up` por já ter um comportamento padrão para XFF; o override explícito foi mantido e testado para garantir exatamente um IP no contrato da API, sem mascarar o aviso. Outros proxies/CDNs à frente exigem nova caracterização de confiança; não habilitar trusted_proxies genérico por conveniência.

## Backup, migração e ativação

Guardar o caminho real da release anterior e parar somente o serviço do Pinte o 7. Usar a CLI **compilada**, não `npm run admin` (o pacote não contém compilador/fontes/scripts do repositório). Carregar a configuração como operador autorizado; um arquivo root:root 0600 não deve ser exposto por chmod para facilitar esse passo. Um operador root pode usar `set -a; . /etc/pinteo7/api.env; set +a` e passar apenas as variáveis conhecidas ao usuário de dados via `sudo -u pinteo7 env ...`.

```sh
sudo systemctl stop pinteo7
# Com configuração carregada e como usuário pinteo7, na NOVA release:
cd "$P7_RELEASE"
node dist/api/server/admin.js import-examples /var/backups/pinteo7/pre-1.0.0-SHA12-DATAUTC
```

O comando exige destino novo e faz backup verificado antes de alterar journal/share. A migração reserva os 34 IDs em journal e retoma sem duplicar/sobrescrever; conflitos ou quota interrompem preservando o progresso e dados. Não limpar a pasta de dados para obter uma migração "limpa". Retenção/espaço e cópia externa ao host precisam estar confirmados; detalhes em `docs/evidencias/t-067/MIGRACAO.md` do repositório de revisão.

Ativar apenas após backup/migração/smoke aprovados. Trocar o symlink por rename no mesmo diretório, sem remover o ativo primeiro:

```sh
# Após conferir o destino e preservar readlink -f /srv/pinteo7/current:
sudo ln -s "$P7_RELEASE" /srv/pinteo7/current.next
sudo mv -Tf /srv/pinteo7/current.next /srv/pinteo7/current
sudo systemctl start pinteo7
curl --fail --silent http://127.0.0.1:5178/api/health
```

`current.next` precisa estar livre; se existir, inspecionar em vez de forçar remoção. O `mv -T` acima é o candidato GNU/Linux, a confirmar no host. Validar health HTTPS, HTML/asset, 34 exemplos, PNG, abrir/executar, compartilhar e recarregar o share, resposta a erro e o site vizinho. Criar apenas a obra de verificação identificada e removê-la offline por UUID se necessário, sem apagar obras reais. Registrar release/tag/SHA/hash do pacote, backup usado, horários, comandos e resultados. Certificado, DNS e disponibilidade externa só são comprovados nessa etapa real.

## Rollback de código preservando shares novos

Se a nova release falhar, parar somente Pinte o 7, fazer **outro backup do estado atual** e apontar `current` para o destino anterior registrado, usando symlink temporário + rename. Iniciar o serviço e validar health, abertura das obras já existentes e o site vizinho. Não restaurar automaticamente o backup pré-deploy: isso apagaria shares criados desde a publicação. O formato persistido v1 é o contrato de compatibilidade do rollback; se a release anterior não o suportar, manter os dados íntegros e escolher uma release compatível.

Restauração de dados é operação diferente: API parada, estado atual preservado, backup íntegro restaurado para pasta privada nova e configuração apontada para ela. Confirmar por hashes/abertura e decidir explicitamente sobre obras mais novas. Não mesclar diretórios de forma cega, não apagar `.instance-lock` sem confirmar que o processo morreu e não remover releases/backups ainda necessários à recuperação.

## Verificação local e fontes

No ambiente local havia Caddy 2.11.4: adaptação da configuração candidata passou. Um processo Caddy temporário em HTTP/loopback, sem admin/TLS/persistência, confirmou XFF único `127.0.0.1` apesar de headers forjados e recusa 413 acima de 3 MiB. Não foi usada a porta do produto nem configuração global. `systemd-analyze` não está disponível no macOS; a unit foi conferida contra a documentação, mas sua validação executável/compatibilidade do host fica para a T-069 após go.

Sintaxe conferida nas fontes oficiais: [Caddy: padrões de handle/proxy](https://caddyserver.com/docs/caddyfile/patterns), [request_body](https://caddyserver.com/docs/caddyfile/directives/request_body), [reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [systemd.exec: diretórios e sandbox](https://www.freedesktop.org/software/systemd/man/259/systemd.exec.html). Nenhuma fonte externa autoriza executar comandos no host antes do go.
