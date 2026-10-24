# Licenças e atribuições — Pinte o 7 1.0.0

Inventário da T-068, em 24/10/2026. O projeto é MIT, copyright © 2013 Márcio Passos: preservar o [LICENSE](../LICENSE) da raiz. O interpretador Papert de Thomas Figg tem aviso MIT próprio, copyright © 2008: preservar também [Papert-License.txt](../Papert-License.txt). A adaptação TypeScript não substitui esse aviso. O projeto surgiu do trabalho de conclusão de curso de Márcio Passos no CESMAC, Maceió–AL; esse contexto acadêmico não atribui autoria de dependências ou de terceiros à instituição.

## Arquivos que acompanham o pacote

Copiar a raiz `LICENSE`, `Papert-License.txt`, este `docs/LICENCAS.md` e **todo o diretório `licenses/`**. Os textos de pacotes instalados foram copiados byte a byte, sem tradução ou substituição de titulares:

- [Avisos reunidos](../licenses/THIRD-PARTY-NOTICES.txt): licenças/avisos disponíveis das dependências de runtime locais, incluindo React, CodeMirror/Lezer, Hono, Zod e sharp.
- [Inventário do lock](../licenses/runtime-lock.json): 52 entradas de runtime, com versões, licença declarada, integridade npm, origem, plataforma, presença local e SHA256 dos textos preservados. São **26 presentes e 26 ausentes** nesta instalação macOS arm64. Entradas opcionais de outras plataformas continuam inventariadas; ausência local não prova seus textos nem seus binários.
- `licenses/packages/<nome-normalizado>/`: arquivos originais LICENSE/NOTICE disponíveis; para o pacote nativo local do libvips, README de licenças e versions.json completos. A normalização remove `@` e troca `/` por `--`.
- `licenses/texts/LGPL-3.0.txt` e `GPL-3.0.txt`: textos completos GNU, com procedência, referência oficial e SHA256 em `licenses/texts/sources.json`. LGPLv3 incorpora termos GPLv3; ambos são mantidos.
- [Manifesto dos assets](../licenses/assets.json): 27 arquivos locais importados pela interface, seus tamanhos, SHA256 e procedência documentada.

O pacote de aplicação **não contém node_modules nem binários nativos**. O host instalará o runtime fixado no lock, com scripts desativados, somente após o go aplicável. Manter integralmente LICENSE/COPYING/NOTICE/README de licenças recebidos pelo npm, inclusive dos opcionais selecionados para a plataforma. Não usar este inventário parcial do macOS como declaração de verificação dos binários Linux. Ferramentas de desenvolvimento/teste não são copiadas no runtime; seu inventário de revisão está nas evidências T-062/T-065/T-066.

## Interface, fonte e assets

O bundle web contém código das famílias React/react-dom/scheduler, CodeMirror, Lezer, `@marijn/find-cluster-break`, crelt, style-mod e w3c-keyname; Zod participa da validação compartilhada. Seus avisos MIT originais estão reunidos no arquivo de avisos e individualizados em `licenses/packages/`. O LICENSE completo do Vite também foi preservado como aviso suplementar para helpers emitidos no bundle, com hash/procedência em `licenses/build-notices.json`; isso não inclui o servidor de desenvolvimento no runtime nem altera a contagem de 52 entradas. O inventário inclui dependências declaradas mesmo quando uma otimização do build elimina parte do código; não é uma alegação de que cada módulo do lock entra no JavaScript entregue.

Nunito local vem de `@fontsource/nunito@5.3.0`, sob **SIL Open Font License 1.1**, copyright 2014 The Nunito Project Authors. O texto completo, incluindo condições de redistribuição e nomes reservados quando declarados, está em [licenses/packages/fontsource--nunito/LICENSE](../licenses/packages/fontsource--nunito/LICENSE). O build usa arquivos Latin nos pesos 400/600/700/800, conservando o OFL com os arquivos de fonte; não se afirma que a fonte está sob MIT do projeto.

Os **21 PNG de personagens** em `images/personagens/`, sons `sounds/click.mp3` e `delete.mp3`, vídeo `videos/blockprog.mp4` e legenda `legendas/pt-br.vtt` são patrimônio preservado deste repositório sob seu LICENSE. Não foram criados novos PNG nesta release nem atribuídos autores individuais de terceiros sem registro. O vídeo/legenda integra a ajuda acadêmica existente; preservar seu conteúdo/créditos. As texturas `wood-grain.svg` e `material-noise.svg` em `src/infrastructure/assets/` foram criadas proceduralmente para este projeto no estudo atual, sob o MIT do projeto. Arquivos e hashes exatos constam no manifesto de assets.

Os 34 exemplos são dados migrados offline, preservados com manifestos/hashes próprios da T-067; não constituem uma biblioteca nova licenciada por inferência. O pacote novo não incorpora fontes comerciais, fancyBox ou as bibliotecas antigas do HTML legado. Sua presença histórica no checkout não autoriza copiar o diretório inteiro para o webroot.

## sharp e libvips no servidor

`sharp@0.35.5` é Apache-2.0; o texto completo está em [licenses/packages/sharp/LICENSE](../licenses/packages/sharp/LICENSE). Seus binários opcionais têm licenças declaradas próprias, listadas abaixo; não aplicar Apache isoladamente a toda a árvore nativa. `detect-libc` também tem texto Apache preservado; `semver` mantém ISC e `@img/colour` mantém MIT.

A instalação local selecionou `@img/sharp-libvips-darwin-arm64@1.3.4`, cujo package.json declara **LGPL-3.0-or-later** e cujo `versions.json` registra libvips **8.18.7**. O README original inclui bibliotecas como glib, freetype, libpng, mozjpeg e outras, com suas licenças próprias; foi preservado inteiro, sem reduzi-las a LGPL. O pacote npm nativo local não forneceu um arquivo LICENSE/COPYING separado. Por isso acompanham este registro o README/versionamento recebido e os textos GNU completos, sem inventar avisos individuais não recebidos.

O [projeto libvips](https://www.libvips.org/) publica a biblioteca sob LGPL-2.1-or-later; o [empacotamento sharp-libvips](https://github.com/lovell/sharp-libvips) documenta o uso de LGPLv3 pela cláusula de versão posterior e publica os scripts de compilação. Fontes e releases oficiais do libvips estão em [libvips/libvips](https://github.com/libvips/libvips); a lista local de versões está em `licenses/packages/img--sharp-libvips-darwin-arm64/versions.json`. Essas referências indicam procedência e obtenção de fonte; não são uma oferta de fonte correspondente hospedada pelo Pinte o 7 nem prova de que uma tag remota específica foi baixada e conferida nesta rodada.

libvips fica como dependência nativa separada/substituível no **servidor**, carregada por sharp; não integra o bundle web e nenhuma biblioteca nativa foi modificada nesta frente. A instalação/publicação deve preservar avisos e possibilidade de substituição dessa dependência. Se o pacote instalado ou os binários forem redistribuídos posteriormente, conferir e cumprir também os termos das bibliotecas nativas efetivamente selecionadas e o fornecimento de fonte correspondente aplicável; não remover seus avisos durante a cópia. Não houve validação de distribuição binária Linux nesta T-068 local.

## Inventário de runtime por entrada do lock

“Local” refere-se somente a esta instalação. A licença da coluna é a declaração do lock; os textos preservados e sua proveniência prevalecem sobre uma mera etiqueta SPDX. Para opcionais ausentes, a retenção dos avisos fornecidos no host é parte da instalação, sem deduzir autoria a partir do nome do pacote.

| Pacote | Versão | Licença declarada | Local |
| --- | --- | --- | --- |
| `@codemirror/autocomplete` | 6.20.4 | MIT | sim |
| `@codemirror/commands` | 6.11.1 | MIT | sim |
| `@codemirror/language` | 6.13.1 | MIT | sim |
| `@codemirror/state` | 6.7.6 | MIT | sim |
| `@codemirror/streamparser` | 6.0.0 | MIT | sim |
| `@codemirror/view` | 6.43.15 | MIT | sim |
| `@fontsource/nunito` | 5.3.0 | OFL-1.1 | sim |
| `@hono/node-server` | 2.1.5 | MIT | sim |
| `@img/colour` | 1.1.0 | MIT | sim |
| `@img/sharp-darwin-arm64` | 0.35.5 | Apache-2.0 | sim |
| `@img/sharp-darwin-x64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-freebsd-wasm32` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-libvips-darwin-arm64` | 1.3.4 | LGPL-3.0-or-later | sim |
| `@img/sharp-libvips-darwin-x64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linux-arm` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linux-arm64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linux-ppc64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linux-riscv64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linux-s390x` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linux-x64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linuxmusl-arm64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-libvips-linuxmusl-x64` | 1.3.4 | LGPL-3.0-or-later | não |
| `@img/sharp-linux-arm` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linux-arm64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linux-ppc64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linux-riscv64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linux-s390x` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linux-x64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linuxmusl-arm64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-linuxmusl-x64` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-wasm32` | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT | não |
| `@emnapi/runtime` | 1.11.3 | MIT | não |
| `@img/sharp-webcontainers-wasm32` | 0.35.5 | Apache-2.0 | não |
| `@img/sharp-win32-arm64` | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | não |
| `@img/sharp-win32-ia32` | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | não |
| `@img/sharp-win32-x64` | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | não |
| `@lezer/common` | 1.5.4 | MIT | sim |
| `@lezer/highlight` | 1.2.5 | MIT | sim |
| `@lezer/lr` | 1.4.11 | MIT | sim |
| `@marijn/find-cluster-break` | 1.0.4 | MIT | sim |
| `crelt` | 1.0.7 | MIT | sim |
| `detect-libc` | 2.1.2 | Apache-2.0 | sim |
| `hono` | 4.13.13 | MIT | sim |
| `react` | 19.3.1 | MIT | sim |
| `react-dom` | 19.3.1 | MIT | sim |
| `scheduler` | 0.28.0 | MIT | sim |
| `semver` | 7.8.5 | ISC | sim |
| `sharp` | 0.35.5 | Apache-2.0 | sim |
| `style-mod` | 4.1.4 | MIT | sim |
| `tslib` | 2.8.1 | 0BSD | não |
| `w3c-keyname` | 2.2.8 | MIT | sim |
| `zod` | 4.6.7 | MIT | sim |

## Conferência desta rodada

As origens, integridades e metadados npm dessas versões foram revisados nas evidências [T-062](evidencias/t-062/DEPENDENCIAS.md), [T-065](evidencias/t-065/DEPENDENCIAS.md) e [T-066](evidencias/t-066/DEPENDENCIAS.md). A T-068 leu os textos realmente instalados, copiou-os sem alterações e registrou hashes. Nenhuma dependência foi instalada ou atualizada para montar esta documentação; nenhum código ou binário foi obtido de URLs arbitrárias. Os termos GNU têm origem registrada em `licenses/texts/sources.json`: LGPL recebido de GNU.org; GPL copiado do COPYING do GNU GMP 6.3.0 já instalado, idêntico ao texto GPLv3 do FFmpeg 9.0.2 local. Os acessos diretos ao texto GPL em GNU.org/Savannah tiveram timeout; não se declara um download bem-sucedido. Não foram copiados código ou binários dessas ferramentas.

O inventário permite conferir cada cópia pelo SHA256 e reproduzir a seleção a partir do package-lock; mudanças no lock, nos assets ou nas versões requerem atualizar este registro antes de novo empacotamento.
