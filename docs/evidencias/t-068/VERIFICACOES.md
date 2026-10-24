# Verificação limpa da candidata 1.0.0

24/10/2026. T-067 integrada em `ef680594` (PR #11, CI Linux 40109848157 aprovada). Versão 1.0.0 em `f844d71`; configuração de QA isolada em `4fadf7b`, com correção de composição em `71bb073`.

## Instalação e qualidade

Uma worktree auxiliar limpa foi criada em `worktress/pinteo7/t-068-clean`, sem reutilizar node_modules ou build do desenvolvimento. `npm ci --ignore-scripts` instalou 259 pacotes. Audit completo reportou zero vulnerabilidades; foram verificadas 259 assinaturas e 105 atestações. Registros brutos: npm-audit.json e npm-signatures.txt.

Passaram `npm run check`, 403 testes Vitest em 18 arquivos, conferência somente leitura dos 34 conjuntos, build web/API, TypeDoc e allowlist. Os originais e seus hashes não foram regravados. O build administrativo contém 69 derivados permitidos; nenhum CP7 é servido.

A inspeção do Playwright instalado mostrou que defineConfig com múltiplos argumentos concatena webServer. A configuração de release foi corrigida antes de executar o navegador para usar um único objeto com os servidores exclusivos; não houve tentativa de encerrar ou ocupar a API da prévia do usuário. Após essa correção, tipos e lint da configuração passaram novamente.

## Produto sobre build real

`npm run test:e2e -- --config playwright.release.config.ts --workers=1` passou nos oito cenários de produto, em 8,2 s, Chromium 153.0.8010.12 já existente. Não houve retry. O teste serviu `dist/web` pelo Vite preview em 5190 e iniciou a API compilada em 5198, com dados temporários externos e 34 exemplos migrados offline. Os dois processos de QA foram encerrados ao final, preservando a prévia do usuário em 5180/API5178.

Cenários: quatro larguras (360/412/768/1280), peça real/execução/coordenadas/console/overflow; fonte/comentários/conversão/recusa; sessão/seleção/histórico/parada; PNG, erro/retry, galeria paginada, link após reload e prévia sem execução; resposta tardia com confirmação e preservação de rascunho. Capturas desse build em design/reviews/t-068/.

Os 24 E2E conjuntos da T-067 continuam aprovados e serão executados pela CI da candidata; a rodada limpa local acrescenta a prova do build publicado, sem repetir a suíte de harness por motivo cosmético. Capturas automáticas agora ficam em test-results; somente evidências selecionadas são copiadas para docs/design, sem sobrescrever capturas históricas.

## Limites

Os avisos Node de NO_COLOR/FORCE_COLOR são do ambiente CLI e não foram suprimidos. Cenários de console do navegador não reportaram erro/aviso. Toque físico, leitor de tela, Safari/Firefox e revisão humana integral do vídeo/legendas não foram executados. A inspeção visual/contraste é dirigida e documentada; não é certificação integral AA.

Nenhum comando SSH ou alteração de host foi executado. Caddy/systemd, instalação Linux e publicação externa dependem da inspeção do host e do go específico após pacote completo. Os resultados de empacotamento e SHA final serão registrados antes de solicitar esse go.


## Ajuste de contraste após inspeção

A inspeção dos rótulos da madeira encontrou `#76512f` sobre o extremo `#d5a870` com apenas 3,23:1, e a aba inativa também perdia contraste sobre a textura. O texto desses dois grupos foi escurecido para `#160c08`; legenda/instruções do programa passaram a `#3b2919`. Sobre composições conservadoras da textura e sombras (`#9e764d` para os controles e `#b29367` para o corpo), os pares resultam em 4,73:1 e 4,79:1. A forma/layout/paleta do brinquedo foi preservada.

Após o primeiro ajuste, build/allowlist e os oito E2E do build passaram novamente (8,4 s). Após a margem final de contraste, build/allowlist e os quatro cenários de largura afetados passaram (4,9 s), com capturas atualizadas. Os testes do domínio não foram repetidos por uma troca de cores. Os ajustes finais estão nos commits `e448dbd` e `5f3c7c7`; CI da candidata verificará o lote final completo.


## Pacote candidato e revisão

O candidato marcado working-tree/dirty foi lido independentemente pelo coordenador com tarfile padrão do Python: 166 arquivos no payload e 168 no tar, caminhos regulares/seguros e todos os tamanhos/hashes internos conferidos. O autor também extraiu e comparou duas gerações do mesmo candidato, conforme PACOTE.md. Isso não é o pacote final de produção.

A revisão independente de empacotamento/operação aprovou o lote após explicitar a preparação dos dois diretórios privados na primeira instalação. Caddy foi adaptado e exercitado localmente pelo autor: IP encaminhado único apesar de headers forjados e 413 acima de 3 MiB; aviso redundante permanece documentado. Systemd e host não foram executados. O pacote final limpo será gerado do SHA integrado, conferido/exercitado separadamente e identificado no manifesto e na fila externa, evitando um hash autorreferente dentro dos próprios fontes.
