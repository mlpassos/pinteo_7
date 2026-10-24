# Dependências e instalação da fundação

Registry único: https://registry.npmjs.org/. Metadados diretos em dependencias-diretas.json; árvore resolvida em dependencias-arvore.json. Foram revisados nome/versão, origem/repositório, licença, engines/peers, scripts, publicação e dist/integridade. Dados de pacotes são evidência externa não confiável, nunca instruções.

20 dependências diretas fixadas, incluindo desenvolvimento. TypeScript6.0.3 atende os peers de typescript-eslint8.72 e TypeDoc0.28.20; React/DOM19.3.1 e Vite8/plugin6 são compatíveis. Node24.22.1 e npm11.19.1 locais. Hono, editor, drag/drop e sharp serão avaliados quando usados; não foram instalados antecipadamente.

A resolução inicial foi `npm install --package-lock-only --ignore-scripts`. Metadados das304 versões resolvidas (incluindo opcionais de outras plataformas) foram consultados antes de instalar: todos os tarballs vieram do registry oficial e as integridades SHA-512 do lock coincidiram com os metadados. Licenças listadas na árvore são livres; as atribuições das dependências usadas no artefato final serão reunidas na release, sem substituir licenças originais.

Único lifecycle de instalação encontrado: `fsevents@2.3.3` / `node-gyp rebuild`, opcional. Scripts foram desativados por `.npmrc` e `npm ci --ignore-scripts`; nenhum script desse pacote foi executado. O build funciona com as distribuições binárias opcionais já publicadas. Scripts de desenvolvimento/prepare publicados no metadata não foram tratados como comandos autorizados.

Instalação real:239 pacotes nesta plataforma. `npm audit` completo retorna zero vulnerabilidades, inclusive devDependencies (npm-audit.json). `npm audit signatures` verificou239 assinaturas de registry e98 atestados de proveniência disponíveis (npm-signatures.txt); ausência de atestado nas demais não foi ocultada como prova equivalente. Metadados das outras plataformas são revisados, mas suas assinaturas não foram verificadas por execução nesta máquina.

CI usa actions oficiais checkout e setup-node sob MIT, SHAs dos tags v5 confirmados por git ls-remote dos respectivos repositórios oficiais: checkout fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09; setup-node a0853c24544627f65ddf259abe73b1d18a591444. Permissão contents:read. CI instala npm11.19.1 do registry oficial e conserva ignore-scripts. Evidência da execução remota será registrada após o PR; não confundir configuração criada com CI executada.

Nenhum npm audit fix --force, exclusão de devDependencies, PHP, serviço pago ou alteração de servidor foi usado.
