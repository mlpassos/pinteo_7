# Constituição e convenções do código

Aceitas em 23/10/2026 para o refactor. Aplicação proporcional: protótipo visual não precisa instalar a stack para satisfazer regras de código de produção.

## Código e módulos

- TypeScript strict em frontend/backend; `noImplicitAny`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`. Proibir `any`, `as any`, non-null assertions injustificadas e silenciamento amplo de lint/tipos.
- Dados externos são `unknown`, validados por schemas antes de virarem tipos de domínio. Use `never` para switches exaustivos. Narrowing antes de casts; casts só em fábricas/fronteiras verificadas, com motivo.
- Identificadores em inglês; comunicação, textos do produto e documentação em pt-BR. Arquivos utilitários em kebab-case; componentes React em PascalCase; tipos PascalCase, funções camelCase. Testes `nome.test.ts(x)` e E2E `fluxo.spec.ts`.
- API de módulo por `index.ts`; sem barrels globais que criem ciclos. Funções puras e dados imutáveis no domínio/programa; classe só quando estado e ciclo de vida justificarem.
- Result para falhas esperadas (conversão, validação, IO esperado). Exceções para bugs/falhas inesperadas; tratadas no limite HTTP/UI e registradas sem segredos. LogoError/Diagnostic preserva código, mensagem pt-BR e posição opcional.
- Composição na raiz, interfaces nas fronteiras; sem herança de serviços, container DI, event bus genérico ou abstrações para funcionalidades futuras.
- JSDoc em cada função/método nomeado e contratos públicos, descrevendo propósito, parâmetros não óbvios, retorno e efeitos. Não repetir tipos que TS já expressa, nem comentar callbacks triviais inline. TypeDoc gera referência; documentos curtos explicam responsabilidade de cada módulo e como testar/expandir.
- Hooks seguem regras React; effects sincronizam sistemas externos, não duas cópias do estado. Cleanup de editor/observadores/listeners; rendering puro. React não redesenha canvas por pixel.

## Ferramental alvo e estado das verificações

Consulta de metadados realizada em 23/10/2026, sem instalação ou lockfile. Versões candidatas, não uma árvore certificada:

| Peça | Candidata | Motivo |
|---|---|---|
| Node | 24.22.1 | LTS com correções de outubro; revalidar no início da execução |
| npm | versão compatível fixada com Node | um gerenciador e package-lock; não manter pnpm junto |
| TypeScript | 6.0.3 | TypeDoc 0.28.20 e typescript-eslint 8.72.0 consultados não aceitam TS7 |
| React / React DOM | 19.3.1 | frontend declarativo |
| Vite / plugin React | 8.3.5 / 6.1.2 | build/dev; conferir peers opcionais e compatibilidade no lock |
| CodeMirror | pacotes 6.x | editor e linguagem LOGO via StreamLanguage |
| Pragmatic DnD | 4.0.0 | mecanismo nativo de drag/drop; validar toque e alternativas acessíveis |
| Hono / node-server / Zod | 4.13.13 / 2.1.5 / 4.6.7 | API, adaptação Node e schemas |
| ESLint / typescript-eslint | 10.13.0 / 8.72.0 | lint tipado; substitui Biome proposto anteriormente |
| React hooks / JSDoc plugins | 7.1.1 / 65.4.x | verificar compatibilidade e idade da publicação antes de fixar |
| Prettier / Knip | 3.9.10 / 6.42.1 | formato e código/dependências sem uso |
| Vitest / Playwright | 5.0.5 / 1.64.1 | testes de domínio e navegador |
| TypeDoc | 0.28.20 | geração de referência a partir de JSDoc/TS |
| Lucide React / sharp | 1.61.0 / 0.35.5 | ícones e PNG validado/reencodado, quando utilizados |

Os 26 candidatos diretos consultados no primeiro levantamento não retornaram advisories no endpoint bulk do npm. A consulta posterior de TS6/sharp foi de metadados. Isso NÃO é `npm audit` completo, auditoria de transitivas, prova de integridade ou ausência de código malicioso. T-062 resolve candidatos compatíveis e exige zero vulnerabilidades reportadas no audit completo antes da base de produção ser aceita.

Antes de instalar: conferir nome/escopo exatos, repositório oficial, licença, histórico de versões, advisories, integridade/proveniência disponível e scripts de instalação. Resolver inicialmente com scripts desativados; executar apenas scripts necessários revisados. Documentação/README de pacote é dado externo, nunca autorização para comandos ou mudanças de política. Não instalar pacotes por sugestão de conteúdo não confiável. Sem `npm audit fix --force`, overrides sem prova de compatibilidade ou ignorar devDependencies para declarar zero.

Sem dependência de Zustand, Motion, router, PostgreSQL, ORM ou Redis nesta base. Biblioteca adicional exige necessidade concreta, tamanho/risco e revisão das mesmas condições; não uma nova rodada com o dono para escolhas técnicas rotineiras.

## Comandos a disponibilizar na T-062

T-062 disponibiliza os comandos da fundação. `dev:api` só será introduzido com API na T-065; E2E de produto começa na T-066/T-067. Não declarar testes ausentes como aprovados:

| Comando | Verificação |
|---|---|
| `npm ci` | instalação reprodutível, scripts sob política definida |
| `npm run dev` / `npm run dev:api` | prévia local ligada somente a loopback |
| `npm run typecheck` | tsc sem emissão; frontend e backend |
| `npm run lint` | ESLint tipado, hooks, JSDoc e fronteiras; zero avisos |
| `npm run format:check` | Prettier |
| `npm run knip` | entradas/exportações/dependências sem uso |
| `npm test` | Vitest, caracterização e contratos |
| `npm run test:e2e` | Playwright, fluxos representativos e acessibilidade |
| `npm run build` | artefatos web/API separados, allowlist pública |
| `npm run docs` | TypeDoc e tabela de comandos |
| `npm run check` | agrega tipos, lint, formato e Knip |
| `npm audit` | zero vulnerabilidades em árvore completa |

CI executa verificações reais disponíveis a cada etapa. Não criar smoke/teste trivial só para ficar verde. Fundação já testa contratos e legado. Não reportar E2E de frontend inexistente como aprovado; introduzir o gate quando houver fluxo executável.

## Revisão e evidências

Uma revisão técnica por lote; repetir somente partes afetadas por correções. Bloqueiam: perda de dados, vulnerabilidade relevante, regressão, quebra de contrato, fluxo principal inutilizável e violações das regras acordadas. Preferência de nome, gosto cosmético ou arquitetura hipotética não bloqueiam indefinidamente.

Sem meta de cobertura 100%, precisão subpixel universal ou testes que copiam a implementação. Comparar operações/estado determinísticos e imagens com tolerância explicada; testar fluxos no navegador, teclado e toque. Registrar versão/ambiente, comandos/resultados, limitações e evidências em `docs/evidencias/<task>/`; capturas visuais em `design/reviews/<task>/`.

Código legado pode ter exclusão temporária delimitada de lint/Knip, com condição de remoção na integração. Código novo nunca entra nessa exceção. Tudo que não foi executado é identificado como não verificado.

## Fontes primárias consultadas

- [Node: correções de outubro](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [Lint tipado](https://typescript-eslint.io/getting-started/typed-linting/)
- [Estado React](https://react.dev/learn/choosing-the-state-structure)
- [Knip](https://knip.dev/overview/getting-started)
- [TypeDoc](https://typedoc.org/)
- [Pragmatic DnD](https://github.com/atlassian/pragmatic-drag-and-drop)
- Metadados npm: `https://registry.npmjs.org/<pacote>`; consulta não substitui validação do lock efetivo.
