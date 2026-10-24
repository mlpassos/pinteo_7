# Pinte o 7

Ambiente educacional de LOGO para aprender programação com blocos, código e desenho. O projeto nasceu de um trabalho de conclusão de curso no CESMAC, em Maceió, e preserva o interpretador Papert e os exemplos originais.

A versão **1.0.0** está publicada em **[pinteo7.instadev.com.br](https://pinteo7.instadev.com.br/)** desde 24/10/2026, após go explícito de Márcio. A tag `v1.0.0` identifica o código `85099a4cb5d7`; os links antigos `instadev.com.br/pinteo7` e seus subcaminhos redirecionam para a aplicação. [Evidências da publicação e recuperação](design/reviews/t-069/RELATORIO.md).

A interface reúne as 19 opções visuais, os 21 personagens preservados, editor LOGO, execução cooperativa, exportação PNG e galeria/compartilhamento por API Node. Os 34 conjuntos de exemplos foram preservados e têm derivados seguros para importação administrativa. Não há login, banco de dados, analytics ou runtime PHP/jQuery na aplicação nova.

## Executar localmente

Use Node **24.22.1** e npm **11.19.1**, conforme o lockfile e a CI. A instalação desativa scripts por `.npmrc`; dependências nativas necessárias já foram verificadas para a base integrada.

```sh
npm ci --ignore-scripts
```

Em um terminal, configure dados privados **fora do checkout** e inicie a API:

```sh
export PINTEO7_DATA_DIR="$HOME/.local/share/pinteo7-dev"
export PINTEO7_PUBLIC_ORIGIN="http://127.0.0.1:5180"
npm run dev:api
```

Em outro terminal:

```sh
npm run dev
```

Abra [Pinte o 7 local](http://127.0.0.1:5180/). O Vite escuta em loopback na porta 5180 e encaminha `/api` à API em loopback na porta 5178. `npm run dev:api` compila e inicia a API, sem hot reload. A galeria começa vazia em um diretório de dados novo; exemplos não são importados implicitamente ao iniciar.

As variáveis da API são `PINTEO7_DATA_DIR` e `PINTEO7_PUBLIC_ORIGIN` (obrigatórias), `PORT` (padrão 5178), `PINTEO7_QUOTA_BYTES` (padrão 250 MiB) e `PINTEO7_TRUST_LOCAL_PROXY` (padrão `false`). Se mudar `PORT`, o proxy Vite também precisa ser coordenado. Não habilite confiança em proxy no desenvolvimento direto.

## Exemplos e administração local

Com a API parada, no terminal com as mesmas variáveis, importe os 34 exemplos preparados:

```sh
npm run admin -- import-examples "$HOME/.local/share/pinteo7-backup-inicial"
```

O destino de backup deve ser absoluto, novo, com pai existente e fora dos dados e do checkout. A importação confere o catálogo fechado, faz backup antes de alterar obras e registra progresso em journal; pode ser retomada com outro destino novo de backup, sem sobrescrever obras. Leia [migração e recuperação](docs/evidencias/t-067/MIGRACAO.md) antes de operar dados existentes.

A mesma CLI oferece `npm run admin -- backup <diretório-absoluto-novo>` e `npm run admin -- remove <UUID>`, sempre com API parada e acesso local aos dados. Backup e rollback de código são operações distintas; nunca apagar dados para trocar de release. Configuração, limites e política de backup estão em [operação da API](docs/evidencias/t-065/API.md); para origem local e migração, prevalecem os comandos atuais deste README e o relatório T-067.

## Verificar e compilar

```sh
npm run check
npm test
node scripts/legacy/import-examples.mjs --check
npm run build
npm run docs
node scripts/check-artifact.mjs
npm audit
```

`check` agrega tipos, lint, formato e Knip. TypeDoc gera `docs/reference/`, não versionado. `npm run build` produz `dist/web/` e `dist/api/` separados; o build da API copia apenas os 69 derivados conhecidos dos exemplos para `dist/api/examples/`. A allowlist pública confere nomes e hashes dos assets autorizados. Somente `dist/web/` é artefato estático público; a API e seus dados ficam fora do webroot. Nunca servir a raiz do repositório como produto.

Para os testes de navegador, instale o Chromium compatível e libere a porta 5178 antes de executar:

```sh
npx --no-install playwright install chromium
npm run test:e2e
```

Em Linux, a CI usa `playwright install --with-deps chromium`. Playwright cria sua própria API com dados temporários externos e importa os 34 exemplos; recusa reutilizar uma API já ativa. Os dados temporários são removidos ao encerrar. Localmente pode reutilizar Vite em 5180; na CI inicia ambos os processos.

Para verificar os 8 cenários de produto contra o **build real**, em portas isoladas:

```sh
npm run build
npm run test:e2e -- --config playwright.release.config.ts
```

Essa configuração usa `vite preview` em 5190 e API temporária em 5198 (`scripts/test-api.mjs --release`), sem reutilizar servidores. Não altera a UI/API de desenvolvimento em 5180/5178. Capturas e traces das execuções ficam em `test-results/`; as evidências históricas versionadas não são regravadas por testes.

O fechamento registrado da T-067 tem **403 testes Vitest e 24 E2E aprovados**, sendo 16 cenários de interface com fakes identificados e 8 com serviços reais. Esses números são evidência da integração anterior, não resultado antecipado do QA final da T-068. Consulte [integração](docs/evidencias/t-067/INTEGRACAO.md) e [matriz de aceite](docs/ACEITE.md) para verificações e limites.

## Contribuir e preservar

- Leia [AGENTS.md](AGENTS.md), [arquitetura](docs/ARQUITETURA.md), [contratos](docs/CONTRATOS.md) e [convenções](docs/CONVENCOES.md).
- O [guia de comandos, blocos e personagens](docs/COMANDOS.md) indica os pontos de extensão e os testes proporcionais.
- Use branches curtas a partir de `main`, revisão técnica e tags `vX.Y.Z`. Publicação exige autorização própria; PR aberto não significa integrado.
- Fonte LOGO é canônica. Conversão visual só aceita documentos integralmente representáveis; alternar sem editar preserva os bytes e comentários. Conteúdo incompatível permanece na CLI com diagnóstico.
- Dependências e assets novos exigem revisão de origem, licença, integridade, scripts e audit completo. Sem pacotes ou infraestrutura por antecipação.

O [PRD](docs/PRD.md) e as decisões de outubro continuam fontes de produto; o [plano](docs/PLANO.md) e as evidências registram execução. Pesquisa antiga e protótipo não substituem o estado integrado.

A raiz `index.html`, `js/`, PHPs e arquivos CP7 permanecem como patrimônio e referência para a caracterização, sem integrar o runtime novo. O harness executa Papert original isolado, com timeout efetivo, e confere os hashes dos originais. Não reativar PHP nem tratar CP7 como HTML seguro. Regeneração de manifesto/baseline é manutenção explícita, nunca efeito colateral de testes. Detalhes: [caracterização](docs/evidencias/t-062/legado.md) e [conversão](docs/evidencias/t-064/CONVERSAO.md).

## Créditos e licenças

- Pinte o 7: MIT ([LICENSE](LICENSE)); Papert, de Thomas Figg e colaboradores: MIT ([Papert-License.txt](Papert-License.txt)).
- Nunito local e ícones WebHostingHub Glyphs históricos: SIL Open Font License. Personagens e ilustrações do projeto são originais.
- Bibliotecas preservadas em `js/` conservam suas licenças. fancyBox 2.1.5, restritivo, permanece somente no legado e não integra o build novo.
- O repositório anterior foi bloqueado por conter uma fonte comercial; esta base usa fontes livres verificadas e preserva as atribuições.

Contato e sugestões: marciopassosbel [at] gmail [dot] com.
