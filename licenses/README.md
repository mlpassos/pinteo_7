# Textos de licença preservados

Este diretório acompanha o pacote Pinte o 7 junto de LICENSE e Papert-License.txt da raiz. Leia `docs/LICENCAS.md` para escopo, atribuições, fonte oficial e limites.

- `THIRD-PARTY-NOTICES.txt`: reunião dos textos de runtime instalados disponíveis.
- `packages/`: cópias byte a byte desses arquivos; README/versions do libvips nativo local.
- `build-notices.json`: aviso suplementar do Vite para helpers emitidos no bundle.
- `runtime-lock.json`: todas as 52 entradas runtime do lock, incluindo opcionais ausentes, e hashes/origens das cópias.
- `assets.json`: hashes e procedência dos 27 assets locais da UI.
- `texts/`: termos GNU LGPLv3/GPLv3 e proveniência/hashes oficiais.
- `Papert-License.txt`: cópia do aviso MIT de Thomas Figg.

Não contém node_modules, código de dependências, fontes de bibliotecas nativas ou binários. Os textos não devem ser removidos ao distribuir o bundle/fontes. O host deve também preservar os avisos originais dos pacotes que o npm selecionar para sua plataforma.
