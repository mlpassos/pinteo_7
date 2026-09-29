# Pesquisa de refatoração do Pinte o 7

Resposta à issue #2. Pesquisa feita em 29/09/2026 sobre o commit `b582715`. Nada aqui altera o código do app; a decisão é do Márcio.

## Recomendação em uma página

**Stack:** TypeScript + Vite no front, React 19 confinado à casca da interface, Node 24 LTS com Hono para uma API mínima. Motor LOGO, tartaruga, renderização e blocos ficam em TypeScript puro, sem framework, com testes em Vitest e Playwright.

**Por quê:**

1. O motor Papert é bom e é MIT. Vale portar para TypeScript preservando gramática, comandos e mensagens em pt-BR, e não trocar por outro interpretador. Ele só toca o DOM em dois pontos (`js/logo.js:147`, `js/logo.js:154`) e o acoplamento da tartaruga com o DOM (`js/turtle.js:214`) se resolve com uma interface injetada.
2. O problema real está na interface: 2740 linhas num único `$(document).ready` (`js/pinteo7.js:73-2812`), estado guardado no DOM, quatro cópias do mesmo handler de drop e sete cópias da mesma configuração de `sortable`. Um render declarativo com estado explícito resolve a classe inteira de problemas; por isso React, e só ali.
3. A infra cabe: Caddy serve o `dist/` do Vite e faz proxy de `/api/*` para o Node. Sem PHP.
4. A migração pode ser feita em 11 etapas pequenas na `main`, com o app funcionando em todas, porque os testes de caracterização vêm antes do primeiro porte.

**Alternativas descartadas, em resumo:** trocar o motor por jslogo (muda o comportamento); Blockly (troca o modelo e o visual dos blocos e quebra a compatibilidade com os 34 compartilhados); GSAP (licença não livre); fancyBox e Intro.js atuais (CC BY-NC e AGPL); sem framework nenhum (viável, mas recria à mão a sincronia estado → DOM justamente onde há mais estado).

**Achados que mudam o que está escrito hoje:**

- Os comandos LOGO são em inglês (`forward`, `rt`, `repeat`), com mensagens em pt-BR. Não há alias em português. O `CLAUDE.md` diz "comandos LOGO em pt-BR" e precisa de ajuste.
- `js/init.js` também é carregado e faz a ponte editor → motor (`js/init.js:40-93`); o `CLAUDE.md` diz que `pinteo7.js` é o único JS de interface.
- Não existe modo professor no app principal; só em `welcome.html`, sem autenticação (`js/welcome.js:227`).
- `save.php` aceita HTML arbitrário no campo dos blocos e o app o injeta para todos os visitantes ao abrir (`js/pinteo7.js:489-513`). É XSS armazenado e deve pesar na decisão de não publicar o PHP.

## Documentos

| Documento | Responde |
|---|---|
| [inventario-atual.md](inventario-atual.md) | O que existe, com arquivo e linha: tamanho, dependências, motor, tartaruga, interface, blocos, PHP, CSS, assets, bugs latentes |
| [avaliacao-stack.md](avaliacao-stack.md) | Perguntas 1 a 3: encaixe de cada peça, tabela de substituições (atual → candidatos → recomendação → licença), comparação honesta com a opção sem framework, alertas de licença |
| [arquitetura-proposta.md](arquitetura-proposta.md) | Pergunta 4: camadas, módulos, padrões (Interpreter, Command, Strategy, Observer), estado, pastas, documentação |
| [layout-ux.md](layout-ux.md) | Pergunta 5: layout em tela cheia com wireframes, interação com blocos, animação com `prefers-reduced-motion`, acessibilidade, toque |
| [plano-migracao.md](plano-migracao.md) | Pergunta 6: 11 etapas com tamanho, risco, critério de pronto e como o comportamento é preservado |
| [adr/](adr/) | 11 ADRs com status "proposto", um por decisão recomendada |

## Versões conferidas

Todas as versões e licenças foram lidas do registro npm em 29/09/2026 (`npm view <pacote> version license`). A tabela completa está em `avaliacao-stack.md`. Resumo do que se recomenda adotar:

| Pacote | Versão | Licença |
|---|---|---|
| typescript | 7.0.2 | Apache-2.0 |
| vite / vitest / @playwright/test | 8.3.1 / 5.0.2 / 1.63.0 | MIT / MIT / Apache-2.0 |
| react | 19.3.0 | MIT |
| codemirror + @codemirror/language | 6.0.2 + 6.12.4 | MIT |
| @atlaskit/pragmatic-drag-and-drop | 4.0.0 | Apache-2.0 |
| motion | 13.4.4 | MIT |
| hono + @hono/node-server + zod | 4.13.10 + 2.1.1 + 4.6.5 | MIT |
| @biomejs/biome / pnpm | 2.5.14 / 12.6.0 | MIT OR Apache-2.0 / MIT |
| zustand / driver.js / lucide-react | 5.0.15 / 1.8.0 / 1.48.0 | MIT / MIT / ISC |

## Próximos passos sugeridos

1. Márcio revisa e marca os ADRs como aceitos, ajustados ou rejeitados.
2. Corrigir as duas frases do `CLAUDE.md` apontadas acima, em PR de docs.
3. Abrir uma issue por etapa do plano, começando pela 0 (ferramental) e pela 1 (testes de caracterização).
4. Abrir a issue de CI para depois da etapa 1.
