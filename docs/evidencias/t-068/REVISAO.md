# Revisão técnica independente — pacote e operação T-068

24/10/2026. Escopo dirigido: `scripts/package-release.mjs`, `deploy/` e `docs/DEPLOY.md`, somente leitura. O revisor não alterou script/configurações/guia, não executou comandos no host e não gerou pacote concorrente com o autor. Este parecer não é go de produção nem substitui a geração final em árvore limpa pelo coordenador.

## Leitura do empacotamento

- O script lê status Git e HEAD reais, recusa árvore suja por padrão e confere consistência da versão package/lock. `--allow-dirty` é exceção explícita para revisão: nome `working-tree` e manifesto `dirty: true`, sem fingir um SHA das alterações não commitadas.
- Recompila antes de ler o payload; executa allowlist web com identidade por SHA-256 dos assets. Para API exige lista exata dos módulos JS e 69 derivados conhecidos, sem copiar CP7/originais. Mudança de HEAD durante build ou de status durante geração causa recusa.
- Payload percorre somente dist/web, dist/api, licenças e configurações aprovadas, além de arquivos fixos de pacote/lock/avisos/guia. Não percorre node_modules, dados persistentes ou a árvore legada. Links e entradas especiais são recusados. Na leitura atual de licenses/deploy, probe independente contou 40 arquivos regulares, sem symlinks, bytes NUL ou extensões de binários nativos; o diretório de licença do macOS contém textos/metadata, não a biblioteca nativa.
- Manifesto registra versão, SHA completo, dirty, epoch e tamanho/hash de cada arquivo do payload. SHA256SUMS cobre também o manifesto; soma externa cobre tar.gz. Não há tentativa de hash autorreferente. A implementação USTAR define modos/UID/GID/mtime/ordem, checksum, padding e prefixo de caminhos longos, recusando travessia e caminhos absolutos.
- Não foi reivindicada aqui geração/reprodutibilidade entre plataformas ou instalação Linux. Leitura/listagem/extração do tar final e confronto integral de hashes em árvore limpa ficam sob coordenação. Repetibilidade descrita no guia é condicionada aos mesmos bytes e implementação de compressão, sem afirmar identidade universal entre ambientes.

## Configurações e operação

Caddy serve somente `current/dist/web` e encaminha /api para loopback, com corpo limitado a 3 MiB, XFF explicitamente sobrescrito e remoção de Forwarded/X-Forwarded-Host recebidos. Adaptação independente com Caddy local passou; o aviso sobre redundância do override XFF permaneceu visível, como documentado pelo autor. O teste HTTP real de spoof/body relatado pelo autor não foi reexecutado pelo revisor.

A unit dedicada usa usuário/grupo próprios, sandbox, UMask e escrita restrita aos dados; código e dependências permanecem separados e somente leitura para o serviço. ExecStart absoluto é candidato a confirmar no host. Diretório de configuração, conta, Node/npm, portas, sistema operacional, TLS/DNS, Caddy e sites vizinhos não são presumidos inspecionados. O guia exige go específico antes dessa fase e não autoriza atualizar o runtime global de outro site.

A instalação usa artefato final identificado, soma externa/interna e diretório novo; dependências nativas serão instaladas no host pelo lock, com scripts desativados e smoke sharp. Administração usa JS compilado: o pacote não depende dos scripts/fontes/build tools ausentes. Migração offline exige trava e backup anterior a journal/obras. Ativação troca symlink por rename, sem apagar a release ativa primeiro.

Rollback de código preserva o diretório de dados, faz outro backup do estado atual e exige compatibilidade com formato v1; não restaura automaticamente backup pré-deploy, que descartaria shares novos. Restauração de dados é operação separada e explícita. Não há promessa de atomicidade global dos 34 registros nem de durabilidade sob queda elétrica.

## Achado operacional corrigido

Na versão inicialmente lida, a primeira migração como usuário `pinteo7` antecedia o primeiro start da unit, porém não havia preparação explícita de `/var/lib/pinteo7` e do pai de backups `/var/backups/pinteo7`. StateDirectory só cria o primeiro ao iniciar a unit; o backup exige pai existente. Em instalação nova, o usuário dedicado não pode criar esses diretórios dentro de /var/lib e /var/backups. O autor acrescentou preparação explícita com `install -d`, dono/grupo pinteo7 e modo 0700, somente para esses diretórios novos, após confirmar conta/inspecionar existência. Diretórios existentes exigem verificação de conteúdo/owner antes de ajustes, sem chown/chmod cego. A correção foi relida; resolve a falha de primeira instalação. Também ficou explícita a criação de uma release nova com o proprietário obtido do operador real, sem deduzir usuário pelo alias SSH.

## Limites

Nenhum acesso remoto/publicação, alteração de dados existentes, instalação de dependências ou validação executável systemd foi feito pelo revisor. `systemd-analyze` está ausente neste macOS; validação da unit/configuração global e compatibilidade real permanecem na T-069 após go. A geração final limpa, hash e extração do pacote final serão evidência do coordenador; este documento não antecipa seus resultados.

## Resultado

Após a releitura da correção operacional, nenhum achado bloqueante pendente no escopo dirigido. `git diff --check` passou. Adaptação Caddy local e probe de tipos de arquivos foram executados pelo revisor, com os limites descritos acima. Pacote candidato/final, extração e hashes completos não foram executados por este revisor e não são alegados como aprovados aqui; o coordenador registra essa prova após fechar o commit. Produção continua dependente de go próprio.
