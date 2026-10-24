# Dependências da interface — T-066

CodeMirror6: state6.7.6, view6.43.15, language6.13.1, commands6.11.1, autocomplete6.20.4; todos MIT, repositórios oficiais code.haverbeke.berlin/codemirror. Nunito local via @fontsource/nunito5.3.0, OFL1.1, repositório fontsource/font-files. Sem CDN. Versões exatas; peers/engines compatíveis com a fundação.

Resolução package-lock-only com scripts desligados antes da instalação.319 entradas resolvidas (318 versões únicas) conferidas via registry oficial; tarballs registry.npmjs.org e integridades SHA512 coincidiram com lock, sem deprecated. Metadata completo em dependencias-adicionadas.json (incremento; fundação em ../t-062/dependencias-arvore.json). Licenças livres; preservar MIT e OFL na distribuição. Lifecycle encontrado apenas fsevents2.3.3 node-gyp rebuild opcional, não executado. Prepare dos pacotes CodeMirror não foi executado nem tratado como instrução.

npm ci --ignore-scripts instalou253 pacotes. npm audit completo zero, incluindo ferramentas. Assinaturas253 e atestados99 verificados; evidências JSON/txt neste diretório. Opcionais de outras plataformas revisados, não executados no MacARM.

PragmaticDnD não foi instalado: alças Pointer Events unificam mouse/toque e permitem destinos/alternativas de teclado sem manter dois sistemas de arraste. Aceite será comportamento testado, não presença de biblioteca. Decisão coordenada com implementador da UI.

## Árvore combinada com API/motor

Após integrar a base6d1ef995, o lock reúne350 entradas/349 versões únicas. Foram reconferidos todos os metadados e integridades; cada nome/versão pertence à união já revisada da fundação, API e interface. Nenhuma atualização transitiva foi introduzida na resolução dos conflitos. Hono/sharp permanecem server-only; Nunito/CodeMirror continuam no frontend.

npm ci --ignore-scripts instalou259 pacotes. Audit completo zero;259 assinaturas e105 atestados verificados. Registros adicionais npm-audit-integracao.json e npm-signatures-integracao.txt preservam a evidência anterior de cada frente. Único lifecycle encontrado continua fsevents opcional, desativado. Scripts não foram habilitados para resolver a instalação.

CI da interface acrescenta a instalação do Chromium suportado pelo Playwright localmente fixado, apenas no runner efêmero do GitHub, e executa E2E real da UI com serviços de teste identificados. Não instala browsers ou pacotes de sistema na máquina do usuário. A integração T-067 substituirá os fakes nos fluxos de produto antes da release.
