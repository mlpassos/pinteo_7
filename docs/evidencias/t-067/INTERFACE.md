# T-067 — composição da interface com serviços reais

Rodada local de 24/10/2026, base `d1b483cf`, checkout principal na branch de integração. Este registro cobre a frente UI/E2E; configuração, HTTP, importação dos 34 exemplos, pacote/lock, fila e aceite global pertencem ao coordenador. Nenhum commit ou alteração de servidor remoto foi feito por esta frente.

## Composição e ciclo de vida

`src/ui/main.tsx` instancia LogoRunner real, o conversor puro (`sourceToBlocks`, `editBlocks`, `blocksToSource`), CanvasRenderer e `createHttpShareStore`. A entrada de produto não importa fakes, harnesses ou seed. A fonte inicial é vazia, representável em Blocos; nenhuma execução é disparada ao montar ou converter.

O runner pertence à composição fora dos efeitos repetidos do StrictMode. App e Stage apenas assinam/desassinam eventos; o Stage cria/libera cada renderer. Pagehide definitivo e HMR desmontam React e encerram o runner de modo idempotente. BFCache preserva o documento React e interrompe execução, permitindo retornar sem reusar um runner já destruído.

A promessa de leitura de `?share=UUID` é criada uma única vez na composição. UUID inválido ou parâmetros duplicados produzem diagnóstico sem requisição. A UI valida o recurso completo e sua correspondência com o ID do link, carrega a prévia limitada e abre documento e desenho juntos. A revisão atual e o personagem são reavaliados no momento da resposta: se o usuário trabalhou durante a rede, a substituição exige confirmação; recusar mantém seu rascunho. Abertura pela galeria tem cancelamento da aplicação tardia quando o diálogo é fechado.

Fonte continua canônica. O conversor real é chamado em ações; falhas de análise, recurso não representável ou edição inválida conservam o texto/projeção anteriores. A edição só é confirmada depois de editBlocks e blocksToSource terem sucesso. Histórico registra a fonte inteira realmente enviada ao runner, limitado a 100 entradas. Seleção visual não restringe execução. Definir procedimento cria um corpo vazio que recebe peças por encaixe, conforme a caracterização; não foi criada seleção múltipla nem transformação de seleção em procedimento.

## Compartilhados, PNG e recursos limitados

Abrir compartilhado **não executa seu LOGO**. A prévia pública é carregada por URL relativa vinculada ao mesmo UUID, com fetch sem credenciais/redirecionamento, tipo PNG, corpo máximo de 2 MiB e dimensões até 2048×2048; assinatura/dimensões e decodificação são verificadas antes de mostrar. Um AbortController com teto de dez segundos cobre fetch/leitura e é abortado no finally, inclusive em headers recusados. Blob URLs da apresentação são liberadas no cleanup do Stage.

A imagem validada aparece sobre o canvas até executar ou limpar. Download e novo compartilhamento usam esse mesmo Blob enquanto a imagem representa o palco. Uma nova execução aceita remove a prévia e passa ao renderer; falha de preparação preserva a prévia. Abrir outra obra/Novo só limpa sessão/desenho após confirmação. Erro de rede, falha de carga, dado inválido ou cancelamento não apagam a fonte em andamento.

O cliente HTTP real foi implementado/revisado pelo coordenador. A galeria usa sua paginação; os 34 exemplos vêm da API, depois da migração offline, sem seed embutido no frontend. A ordenação ascendente do repositório foi respeitada: o E2E percorre a próxima página para encontrar a obra recém-criada. A primeira execução falhou somente porque o teste supunha que ela estaria na primeira página; não houve mudança de ordenação para satisfazer o teste.

## Apresentação e contraste dirigido

O renderer exporta pixels com fundo branco. Grade e papel leves são uma camada CSS de apresentação (`.stage::after`), sem capturar ponteiro, modificar coordenadas ou entrar no PNG. Assim a superfície do brinquedo mantém a direção v6 e o arquivo baixado/compartilhado permanece fiel ao renderer. A mesma camada visual acompanha a prévia recuperada; seus bytes não são modificados.

A revisão do coordenador encontrou contraste insuficiente nos pequenos rótulos sobre coral e no painel de saída. Rótulos foram escurecidos para `#160c08`; saída/histórico recebeu fundo creme opaco `#fff4d8` e texto `#54321f`. Cálculo WCAG sRGB dos pares controlados:

| Trecho | Texto / fundo conservador | Contraste |
| --- | --- | --- |
| Rótulos do coral | `#160c08` / extremo escuro `#d75c48` | 5,06:1 |
| Rótulos com microtextura | `#160c08` / `#cc5845` | 4,63:1 |
| Saída/histórico | `#54321f` / `#fff4d8` opaco | 10,35:1 |
| Botão primário | `#fff9e8` / extremo claro `#367c6e` | 4,68:1 |
| Legenda do palco | `#53664a` / `#e5e7cf` | 4,95:1 |
| Texto geral | `#263f3b` / `#fffaf0` | 10,87:1 |

Para a microtextura, `#cc5845` é uma composição conservadora do extremo coral mais escuro com os 6% máximos da cor fixa do SVG de ruído, arredondada a canais sRGB de oito bits. Os rótulos ficam na área superior mais clara do gradiente; o cálculo usa o extremo inferior para não depender dessa posição. O limite adotado é 4,5:1 para texto pequeno. Isso é uma verificação dirigida dos controles/textos principais, não certificação AA integral.

## E2E de produto executado

`PINTEO7_CHROMIUM=<binário existente 1243> npm run test:e2e -- tests/e2e/product.spec.ts --workers=1`: **oito testes passaram** em Chromium 153.0.8010.12. Playwright iniciou API real em 5178, dados temporários fora do checkout e 34 exemplos migrados offline; usou Vite real em 5180. A API temporária foi encerrada ao final; Vite continuou disponível ao coordenador. A rodada fez apenas **um POST real**; o erro de rede foi abortado no navegador antes do servidor, preservando o limite real de 5 POST/min/IP.

Verificações:

- Quatro larguras 360/412/768/1280: inserir peça real, executar, coordenadas do personagem, caixa do canvas igual à superfície, scrollWidth igual ao viewport e zero erros/avisos de console. Capturas em `design/reviews/t-067/{360,412,768,1280}.png`.
- CLI com comentários, aliases fd/rt, espaços e newline: alternância intacta, edição visual real preservando comentário; random sem equivalente recusa Blocos e mantém o texto, sem modificar pixels durante a conversão.
- Peça selecionada continua executando fonte inteira; definição de procedimento tem corpo vazio e peças anteriores permanecem na raiz. Variável persistiu entre execuções reais; saída/histórico foram observados. Loop sem desenho foi parado, botão voltou a habilitar e a fonte foi preservada. Limpar zerou histórico.
- PNG real baixado com assinatura PNG; escolha de Capivara; aviso público; falha de rede seguida de retry real; galeria paginada; reload do link recuperou fonte, personagem e prévia com pixels de tinta, **zero execuções** e apenas um GET de documento, mesmo em StrictMode.
- Download da prévia recuperada; nova execução remove a imagem e desenha pelo renderer. Resposta de link retida até depois da digitação pediu confirmação; cancelar preservou o rascunho. Link inválido mostrou erro e o editor continuou utilizável.

Na revisão das capturas, o coordenador observou uma instrução de encaixe ainda visível depois da inserção e um skiplink deslocado na captura fullPage feita após scroll. A edição confirmada agora anuncia sucesso, substituindo a instrução anterior. As capturas são feitas após scrollTo(0,0), mantendo o skiplink acessível. Os quatro cenários de largura foram repetidos com assert do feedback: **4/4 passaram**, capturas atualizadas, sem espera artificial nem POST real.

ESLint dos arquivos da UI e do novo spec passou; TypeScript global passou durante a rodada. A revisão independente de ciclo de vida/abertura tardia/prévia apontou apenas o recurso sem timeout, corrigido nesta frente. A releitura com probe do módulo real confirmou timeout de dez segundos em leitura pendente, abort e remoção do timer, inclusive ao recusar headers; nenhuma outra pendência foi encontrada nessa revisão dirigida. O coordenador executará os checks completos e os 24 E2E conjuntos, portanto esses resultados globais não são antecipados aqui.

## Limites

Toque físico, troca física de monitor/DPR, leitor de tela e auditoria AA integral não foram executados nesta rodada. A suite dirigida T-066 já cobre Pointer Events com toque emulado, foco, redução de movimento e resize/DPR com renderer real; sua evidência não foi rebatizada como teste físico. Publicação remota continua fora desta frente e exige o go da tarefa de produção.
