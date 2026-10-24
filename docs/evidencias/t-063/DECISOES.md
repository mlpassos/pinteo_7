# Decisões do motor, execução e Canvas — T-063

24/10/2026. Alterações técnicas coordenadas após o aceite visual da T-061; não alteram escopo nem autorizam produção. O commit `0768285` preserva separadamente o porte inicial comparado aos 34 programas originais. A mudança seguinte introduz cooperatividade, limites, runner/renderer e as correções explicitadas abaixo. Nenhum original ou baseline foi regenerado.

## API e responsabilidade

- `src/core/logo/index.ts`: `parseLogo(source, signatures?) → Result<ParsedLogo>`, catálogo de 80 operações, resolução de aliases e `LogoEngine`. Parser não executa e não importa DOM/Node/React. `ParsedLogo` conserva fonte, comentários brutos e AST com offsets UTF-16 semiabertos. A AST contém number/symbol/variable/call/list/define; call mantém nome/alias/infixo original. Definições guardam parâmetros e corpo; listas distinguem colchetes e parênteses.
- `LogoEngine.prepare(source)` produz o generator cooperativo; `run(source)` drena **o mesmo avaliador** em testes. Não existe interpretador paralelo de testes nem eval/Function. Efeitos tipados são retirados com `takeEffects`. Semente e algoritmo Papert são preservados; `srand` permite referência determinística.
- Definições persistem na sessão com sua fonte original. Corpos são reanalisados e cacheados por revisão das assinaturas: um chamador definido antes do callee em outra execução continua funcionando. Os spans são deslocados para a fonte original da definição; não se perdem posições no runtime.
- `src/application/runner/index.ts`: `createRunner()` implementa Runner. `LogoRunner` aceita agendador/limites injetados para testes; eventos e cleanup seguem a porta. `clear` e `setSpeed` seguem o contrato coordenado no commit de origem `18e8db9`, trazido à worktree como `69077a8`.
- `src/infrastructure/canvas/index.ts`: `createRenderer(canvas, sprite?)`. O sprite opcional é elemento existente; a UI seleciona `src` usando o catálogo dos 21 personagens. Trocar imagem não altera estado LOGO. Canvas exporta somente desenho, sem sprite/controles.

## Sessão e velocidades

Variáveis, procedimentos, posição, orientação, pena, cor e desenho persistem entre execuções normais. Trocar velocidade muda somente agendamento. Parar cancela avaliação e entrega de efeitos pendentes, preservando estado já aceito; callbacks antigos são invalidados por geração. Cancelar dentro de um procedimento desenrola seus escopos em `finally`. Cancelar/limpar dentro de um observador também interrompe entrega dos snapshots antigos. Erro agora conserva ambiente; a fonte continua pertencendo à UI e nunca é apagada pelo runner.

Limpar (`clear`) cancela, cria ambiente/tartaruga novos, limpa saída e desenho. `reset` LOGO reinicia somente tartaruga/desenho, preservando símbolos e saída. `cleartext` limpa saída; `clean` apaga tinta sem retornar ao centro. `home` retorna ao centro sem apagar tinta. Undo/redo do motor continuam inertes porque o mecanismo original estava comentado; não foi acrescentada funcionalidade fora do escopo.

**Decisão coordenada com o agente principal:** lento tem 90 ms por comando que atualiza desenho/tartaruga; normal 12 ms; rápido consome lotes com intervalo de 1 ms quando houve desenho. Fatias sem desenho cedem com intervalo de 0 ms e no máximo aproximadamente 8 ms de computação; também há teto de passos por fatia. Uma peça/comando é a unidade visível da execução. O DelayTurtle original segmentava a lenta em micropassos de 1 pixel, escondia personagem nas outras velocidades e recriava tartaruga ao trocar velocidade. Isso não foi perpetuado: distância fracionária mantém sua geometria exata e personagem fica visível salvo comando `hideturtle`. **Não há interpolação contínua ponto a ponto** de um `forward` longo; não alegar essa animação. A escolha evita multiplicar o log e a semântica de Parar conforme velocidade, mantendo execução simples e legível.

## Correções deliberadas

| Defeito caracterizado | Resultado novo e evidência |
|---|---|
| `last` indexava além do final | Último elemento correto; caso `last [1 2 3] → 3`. |
| `bitxor` usava OR | XOR real: `3 xor 1 → 2`. |
| `bitand` iniciava acumulador em 1 | Primeiro operando inicia redução: `6 and 2 → 2`. |
| Alias `greaterequalp` sobrescrito por `lessequal?`; `lessequalp` ausente | Aliases apontam para seus comandos corretos; infixos preservados. |
| `array n` criava lista esparsa por for-in em array vazio | Lista de n zeros, com limite antes da alocação. |
| `clean` referenciava função sem invocá-la | Emite clear conservando posição/cor/pena. |
| Tokenizer não reconhecia `do.until`/`do.while` registrados e capturava prefixos `to`/`end` | Reconhece controles pontuados e nomes completos como total/endereco. |
| Parênteses seguidos de infixo eram ignorados em certos casos | `print (1 + 2) * 3 → 9`; harness original imprime 3, registrado em teste separado. |
| Números negativos literais não eram aceitos em campos | Aceita literais negativos com span, preservando `minus` e infixo; necessário aos slots numéricos existentes. |
| Variável indefinida/argumentos inválidos causavam TypeError ou valores não finitos | Diagnóstico pt-BR localizado; não apaga fonte, ambiente ou programas originais. |
| Recursão/loop síncrono não atendia Parar; stop podia ser ignorado no nível superior | Avaliador cede em nós/iterações e respeita limites; `stop` encerra o fluxo corrente. |
| Tail-call antigo podia engolir erro como valor e corromper estado | Retorno/erro separados, escopos restaurados ao falhar ou cancelar; profundidade limitada. |

Usos CLI úteis foram comparados diretamente ao harness original além dos desenhos: listas, mutação por referência, fput/lput (incluindo achatamento de lista), print variádico, aritmética/infixos, escopo dinâmico/global, output/stop de procedimentos, chamadas com parâmetros entre execuções, aliases e semente. Não substituir o TXT por representação parcial nem regravar fixtures para esconder divergências.

## Limites e segurança de recursos

Por execução: fonte UTF-8 20 KiB; 100 mil passos (incluindo coerção de listas); 100 mil operações de desenho; 20 KiB de saída; profundidade de procedimento 200. Parser limita aninhamento a 200. Limites são configuráveis, validados e nunca desativados por entrada LOGO.

Por sessão: orçamento cumulativo de 100 mil itens alocados em listas (inclui literais, array, fput/lput e cópias butfirst/butlast), até 2.048 nomes por escopo e 256 procedimentos. A alocação cumulativa é conservadora: itens de arrays já coletáveis continuam consumindo orçamento até Limpar. Isso evita estimar heap ou permitir crescimento ilimitado entre execuções. Log geométrico tem até 100 mil operações desde a última limpeza. Erro legível orienta Limpar quando necessário; nenhuma obra é removida silenciosamente.

Coerções de listas para texto **e palavras intermediárias**, inclusive lput com segundo argumento string, usam generator limitado antes de concatenar. Listas compartilhadas exponenciais não passam por `String(array)` nativo; ciclos e profundidade são tratados. Testes da revisão independente verificam expansão de 27 iterações sem materializar centenas de MiB, reserva de cópias e aridade tardia entre sessões. Geometria valida endpoint finito antes de emitir/alterar posição; overflow de duas distâncias finitas ~1e308 retorna diagnóstico sem DrawOp/TurtleView inválido. Cor, raio, largura e índices também são validados.

Canvas conserva coordenadas lógicas 500×500, aplica transformação com letterboxing/DPR, recorta operações na área lógica original e redesenha o log. Backing bitmap limitado a 2048×2048 para conter memória/exportação. Sprite fora da área lógica fica oculto. Exportação tem fundo branco e não inclui DOM do personagem.

## Verificação real

`tests/motor/` contém comparação integral da geometria dos 34 exemplos com a baseline imutável (tolerância absoluta menor que5e-10), testes semânticos confrontados com Papert, correções, cancelamento/limites/sessão, callbacks reentrantes e renderer. Testes síncronos drenam o mesmo generator usado pelo navegador.

`tests/motor/browser-check.mjs` inicia Vite próprio em 127.0.0.1:5181, abre Chromium headless e encerra browser/servidor ao terminar. Usa o harness técnico `design/reviews/t-063/harness.html`; não muda a UI de produto nem disputa a aba aberta do usuário. Executar com o browser Playwright disponível ou definir `PINTEO7_CHROMIUM_BIN` para um executável local existente. Nesta máquina foi usado Chromium153.0.8010.12 em cache; nenhuma instalação de browser ou dependência nova foi feita.

A evidência em `browser.json` e `design/reviews/t-063/canvas-chromium.png` registra: botão Parar num timer real de 30 ms para forever/repeat1bilhão/recursão com loop sem desenho; atraso do timer e duração do handler abaixo de250 ms; três velocidades com mesma posição/orientação fracionária; resize800×400 DPR2 mantendo coordenadas, tinta verificada nos pixels; PNG válido43.637bytes; troca de personagem sem alteração do motor; zero page errors. A recursão direta sem desenho também possui teste de profundidade, em vez de prometer profundidade ilimitada. Resultado é cenário local documentado, não garantia de tempo para toda máquina.

Comandos globais verificados localmente: `npm run check`, `npm test`, `npm run build`, `npm run docs` e `npm audit` (zero vulnerabilidades). A entrada web ainda é a fundação; build não é evidência da UI final. CI/merge/deploy e atualização da fila continuam sob responsabilidade do coordenador.

### Resultado final local deste lote

102 testes do motor em quatro arquivos; 195 testes totais em nove arquivos passaram. `npm run check` passou com TypeScript strict/core sem DOM, ESLint sem avisos, Prettier e Knip. Build, TypeDoc e audit completo passaram. Nova verificação Chromium após os tempos90/12/1 confirmou `runningBefore:true` nos três cancelamentos; maior atraso do timer1,7ms e maior duração do handler0,2ms. A captura e JSON foram atualizados com o código final. Revisão independente das três correções de recursos/assinaturas, conduzida pelo coordenador, informou ausência de bloqueios.
