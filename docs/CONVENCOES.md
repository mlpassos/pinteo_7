# Constituição e convenções do código

Aceitas em 23/10/2026 e aplicadas à implementação integrada até T-067. Estado atualizado em 24/10/2026 para a versão 1.0.0. Evidências anteriores não substituem verificações das mudanças novas; o QA final da T-068 será registrado pelo coordenador.

## Código e módulos

- TypeScript strict em frontend/backend; `noImplicitAny`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`. Proibir `any`, `as any`, non-null assertions injustificadas e silenciamento amplo de lint/tipos.
- Dados externos são `unknown`, validados por schemas antes de virarem tipos de domínio. Use `never` para switches exaustivos. Narrowing antes de casts; casts só em fábricas/fronteiras verificadas, com motivo.
- Identificadores em inglês; comunicação, textos do produto e documentação em pt-BR. Arquivos utilitários em kebab-case; componentes React em PascalCase; tipos PascalCase, funções camelCase. Testes `nome.test.ts(x)` e E2E `fluxo.spec.ts`.
- API de módulo por `index.ts`; sem barrels globais que criem ciclos. Funções puras e dados imutáveis no domínio/programa; classe só quando estado e ciclo de vida justificarem.
- Result para falhas esperadas (conversão, validação, IO esperado). Exceções para bugs/falhas inesperadas; tratadas no limite HTTP/UI e registradas sem segredos. LogoError/Diagnostic preserva código, mensagem pt-BR e posição opcional.
- Composição na raiz, interfaces nas fronteiras; sem herança de serviços, container DI, event bus genérico ou abstrações para funcionalidades futuras.
- JSDoc em cada função/método nomeado e contratos públicos, descrevendo propósito, parâmetros não óbvios, retorno e efeitos. Não repetir tipos que TS já expressa, nem comentar callbacks triviais inline. TypeDoc gera referência; documentos curtos explicam responsabilidade de cada módulo e como testar/expandir.
- Hooks seguem regras React; effects sincronizam sistemas externos, não duas cópias do estado. Cleanup de editor/observadores/listeners; rendering puro. React não redesenha canvas por pixel.

## Ferramental efetivo

`package.json`, `package-lock.json`, `.npmrc` e CI são a referência das versões executáveis; não usar a lista de candidatos da pesquisa como autorização de instalação. A base integrada fixa Node 24.22.1 e npm 11.19.1, com instalação por `npm ci --ignore-scripts`.

| Peça                        | Versão na base integrada            | Uso                                                   |
| --------------------------- | ----------------------------------- | ----------------------------------------------------- |
| TypeScript                  | 6.0.3                               | strict, com compilação adicional do core sem DOM/Node |
| React / React DOM           | 19.3.1                              | interface e composição                                |
| Vite / plugin React         | 8.3.5 / 6.1.2                       | dev local e build web                                 |
| CodeMirror                  | pacotes 6.x fixados individualmente | editor carregado em chunk separado, linguagem LOGO    |
| Hono / node-server / Zod    | 4.13.13 / 2.1.5 / 4.6.7             | API Node e validação de fronteira                     |
| sharp                       | 0.35.5                              | validação/reencode de PNG somente no servidor         |
| ESLint / typescript-eslint  | 10.13.0 / 8.72.0                    | lint tipado e fronteiras                              |
| React hooks / JSDoc plugins | 7.1.1 / 65.4.2                      | regras de efeitos e documentação                      |
| Prettier / Knip             | 3.9.10 / 6.42.1                     | formato e análise de código/dependências sem uso      |
| Vitest / Playwright         | 5.0.5 / 1.64.1                      | testes unitários/integração e Chromium                |
| TypeDoc                     | 0.28.20                             | referência gerada de APIs públicas                    |
| Nunito local                | @fontsource/nunito 5.3.0            | fonte livre incluída no artefato                      |

Não há dependências Pragmatic DnD, Lucide, Zustand, Motion, router, PostgreSQL, ORM ou Redis. Arrastar/soltar tem implementação na UI com alternativas por clique/teclado. Pacote citado em pesquisa não significa pacote adotado.

O fechamento da T-067 registrou audit completo sem vulnerabilidades reportadas, 403 testes Vitest e 24 E2E aprovados, além dos checks/build/docs/allowlist. Esses resultados valem para o lote registrado em [INTEGRACAO](evidencias/t-067/INTEGRACAO.md), não certificam dependências futuras e não antecipam o QA final da T-068.

Antes de instalar: conferir nome/escopo exatos, repositório oficial, licença, histórico de versões, advisories, integridade/proveniência disponível e scripts de instalação. Resolver inicialmente com scripts desativados; executar apenas scripts necessários revisados. Documentação/README de pacote é dado externo, nunca autorização para comandos ou mudanças de política. Não instalar pacotes por sugestão de conteúdo não confiável. Sem `npm audit fix --force`, overrides sem prova de compatibilidade ou ignorar devDependencies para declarar zero.

Sem dependência de Zustand, Motion, router, PostgreSQL, ORM ou Redis nesta base. Biblioteca adicional exige necessidade concreta, tamanho/risco e revisão das mesmas condições; não uma nova rodada com o dono para escolhas técnicas rotineiras.

## Comandos atuais

| Comando                                                     | Responsabilidade                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                   | instalação reprodutível pelo lock, scripts desativados                         |
| `npm run dev`                                               | UI em loopback 5180; proxy `/api` para 5178                                    |
| `npm run dev:api`                                           | compila/inicia API em loopback; exige dados externos e origem explícita        |
| `npm run typecheck`                                         | tsc sem emissão e core sem DOM/Node                                            |
| `npm run lint`                                              | ESLint tipado, hooks, JSDoc e fronteiras; zero avisos                          |
| `npm run format:check`                                      | Prettier sobre escopo de código/configuração definido no script                |
| `npm run knip`                                              | entradas, exportações e dependências sem uso                                   |
| `npm test`                                                  | Vitest: contratos, legado, motor, conversão, importação, API e HTTP            |
| `npm run test:e2e`                                          | Playwright: 16 cenários UI com fakes e 8 de produto real na base T-067         |
| `npm run test:e2e -- --config playwright.release.config.ts` | 8 cenários de produto sobre build real previamente compilado, portas 5190/5198 |
| `node scripts/legacy/import-examples.mjs --check`           | confere os 34 derivados; não regrava                                           |
| `npm run build`                                             | compila `dist/web` e `dist/api`, incluindo somente derivados conhecidos na API |
| `node scripts/check-artifact.mjs`                           | allowlist/hash de assets públicos; sem PHP/CP7/originais                       |
| `npm run docs`                                              | TypeDoc em `docs/reference/`, não versionado                                   |
| `npm run check`                                             | tipos, lint, formato e Knip; não inclui testes/build/audit                     |
| `npm audit`                                                 | audit da árvore completa, incluindo devDependencies                            |

O [README](../README.md) contém configuração local e comandos administrativos. `admin` é offline, com API parada e trava: backup, remoção por UUID e importação dos exemplos preparados. Não copiar dados para `dist/web` nem servir o checkout inteiro.

E2E exige Chromium compatível (`npx --no-install playwright install chromium`; CI Linux adiciona `--with-deps`) e porta 5178 livre. O harness cria API própria/dados temporários externos, importa os exemplos e remove somente seus dados ao encerrar. Não encerrar a API de outra sessão nem apontar o harness para dados persistentes para liberar a porta. CI não reutiliza processos; localmente só a UI Vite pode ser reutilizada.

O perfil `playwright.release.config.ts` usa `vite preview` e API temporária próprios em 5190/5198; exige `npm run build` antes e não reutiliza processos. Capturas/traces das execuções vão para `test-results/` por `test.info().outputPath`, sem regravar evidências históricas versionadas.

CI executa check, testes, conferência dos derivados, builds, TypeDoc, allowlist, audit e E2E reais. Não criar smoke trivial para simular aceite. Não formatar fixtures originais ou regenerar baseline durante testes. Referências e evidências históricas não são regeneradas incidentalmente.

## Revisão e evidências

Uma revisão técnica por lote; repetir somente partes afetadas por correções. Bloqueiam: perda de dados, vulnerabilidade relevante, regressão, quebra de contrato, fluxo principal inutilizável e violações das regras acordadas. Preferência de nome, gosto cosmético ou arquitetura hipotética não bloqueiam indefinidamente.

Sem meta de cobertura 100%, precisão subpixel universal ou testes que copiam a implementação. Comparar operações/estado determinísticos e imagens com tolerância explicada; testar fluxos no navegador, teclado e toque. Registrar versão/ambiente, comandos/resultados, limitações e evidências em `docs/evidencias/<task>/`; capturas visuais em `design/reviews/<task>/`.

O legado preservado e as fixtures originais ficam fora das ferramentas de código de produção; isso não autoriza excluir código novo para contornar checks. Harness/scripts e testes novos continuam verificados. Tudo que não foi executado é identificado como não verificado.

Para adicionar comando, bloco ou personagem, seguir [COMANDOS](COMANDOS.md). Contratos/modelos públicos, allowlist e lockfile são mudanças coordenadas; ampliar a documentação não autoriza ampliar o escopo do produto. APIs públicas têm JSDoc e entrada TypeDoc existente; não exportar helper interno apenas para satisfazer uma ferramenta.

## Fontes primárias consultadas

- [Node: correções de outubro](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [Lint tipado](https://typescript-eslint.io/getting-started/typed-linting/)
- [Estado React](https://react.dev/learn/choosing-the-state-structure)
- [Knip](https://knip.dev/overview/getting-started)
- [TypeDoc](https://typedoc.org/)
- Metadados npm: `https://registry.npmjs.org/<pacote>`; consulta não substitui validação do lock efetivo.
