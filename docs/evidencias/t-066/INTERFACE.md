# T-066 — interface React da oficina v6

Implementação local em 24/10/2026, baseada em T-062 `bea82feb` e no layout v6 explicitamente aprovado na T-061. Trabalho na branch `codex/t-066-pinteo7-interface-react`, worktree `worktress/pinteo7/t-066`. O coordenador mantém contratos, dependências, configurações e integração. A frente não publica o produto.

## Composição e integração

A API do módulo está em `src/ui/index.ts`: `App` e `UiServices`. `App` recebe `services`, `initialDocument` opcional e `environmentLabel` opcional. `initialDocument` é somente inicial; obras abertas depois passam pela confirmação da própria UI. O documento recebido da composição deve estar validado. Sem `services`, a tela declara que motor, conversor e compartilhamento aguardam integração; executar, limpar, PNG e compartilhar ficam indisponíveis. Não há implementação falsa dessas portas no bootstrap.

`UiServices` injeta `Runner`, `ConversionService`, `ShareStore` e `createRenderer(canvas: HTMLCanvasElement): Renderer`. A instância do runner pertence à composição: a UI assina/desassina eventos e chama start/stop/clear/setSpeed; quem cria deve liberar o runner no teardown final. Cada montagem do Stage cria seu renderer, observa tamanho, entrega operações de desenho em ordem e libera renderer/observer/assinatura ao desmontar. O PNG vem de `Renderer.exportPng`, nunca de uma captura de HTML.

A UI usa as portas físicas de T-062. A extensão coordenada `Runner.clear`/`setSpeed` veio de `18e8db9` (cherry-pick local `437aa9a`). Limpar cancela/reinicia sessão e limpa tinta, saída, histórico e diagnósticos, preservando o documento. `clear-text` emitido por um comando LOGO limpa somente a saída, sem apagar histórico. Abrir/Novo só limpa a sessão quando a substituição é confirmada; cancelar mantém fonte e desenho. A integração real de motor, conversor, renderer e HTTP e a abertura inicial por `?share=` pertencem à T-067.

A fonte LOGO é canônica. O reducer conserva revisão e projeção; recusa projeções antigas e commits visuais de outra revisão. A conversão é chamada em ações, sem executar LOGO. Uma edição passa por editBlocks e blocksToSource antes de um commit único fonte/projeção. A revisão do resultado é reancorada na próxima revisão local; originalSource recebe exatamente o texto retornado pelo conversor. Falha em qualquer passo conserva o documento anterior. Alternar para Código, focar/desfocar um campo sem editar e cancelar um campo com Escape não serializam a fonte.

Os efeitos não sincronizam duas fontes concorrentes. CodeMirror tem ciclo de vida próprio, carregamento local separado com import(), e só recebe atualização externa quando seu documento diverge. O texto digitado segue intacto, mesmo inválido ou sem equivalente visual. Diagnósticos deslocam o editor para o offset UTF-16 disponível. Há números de linha, indentação, histórico do editor, realce LOGO e autocompletar local. Campos numéricos aceitam números e `:variável`, e operadores são árvores de expressões, não blocos genéricos.

## Interações e materiais

A direção é a v6: madeira tátil à esquerda, carcaça coral inteira à direita, gaveta de categorias no topo; empilhamento em até 650 px. Os dois controles circulares são decorativos, fora da árvore de foco. Texturas SVG são as duas originais aprovadas, estáticas e locais. Nunito é local, subconjunto latino e pesos 400/600/700/800; o texto integral da licença SIL OFL acompanha o bundle e pode ser lido na ajuda.

A paleta contém exatamente 19 opções: sete movimentos/posição, quatro de desenho, repetição, definir/chamar procedimento, variável e quatro operadores de valor. Peças contêm campos e controles de selecionar, mover acima/abaixo, escolher outro encaixe e excluir. Corpos vazios e intervalos entre irmãos têm destinos explícitos. Operadores também podem ser arrastados da paleta a um campo. Novos procedimentos recebem nome disponível; chamadas sugerem o primeiro procedimento existente. A validação final de nomes, ciclos e tipos continua sendo do conversor real.

A escolha deliberada para DnD foi uma única implementação de Pointer Events, sem biblioteca de arraste HTML. Captura e touch-action:none ficam somente nas alças; o restante permite rolagem por toque. Há limiar antes de mover, destino destacado, preview, deslocamento da área e cancelamento sem remover o original. Selecionar comando/movimento e depois encaixe funciona por clique ou Tab/Enter; Alt+setas reordena irmãos e Delete exclui o bloco focado. A edição confirmada conserva o foco numa peça ou na aba após exclusão. O som de encaixe é o `sounds/click.mp3` original e pode ser silenciado; exclusão usa o som original de apagar. Movimento reduzido impede a microanimação de encaixe.

Diálogos nativos contêm foco e devolvem ao acionador; a UI também restaura foco explicitamente na desmontagem React e ao trocar o conteúdo do diálogo. Personagens preservam os 21 IDs/assets. Galeria valida os dados recebidos, é paginada e não altera fonte em falha/cancelamento. Compartilhar informa publicidade, oferece tentativa novamente e preserva o programa/desenho em falha. Ajuda contém referência, instruções de teclado, vídeo MP4 e legendas VTT locais, carregados somente por demanda (`preload=none`). Strings de programa e saída são texto, nunca HTML.

Som, velocidade e personagem são as únicas preferências persistidas, sob chave versionada. Zod estrito valida dados locais; JSON inválido, campos extras, privacy mode ou quota não impedem o uso. Fonte, histórico e dados pessoais não são gravados em localStorage. A saída visível fica limitada a 20 KiB UTF-8 sem partir caracteres; histórico tem no máximo 100 execuções.

## Harness e fronteira de aceite

`tests/ui/index.html` é um harness fora do root/artefato Vite. Ele monta a mesma App com fakes explícitos e um aviso visível: **TESTE DE INTERFACE — serviços falsos, sem executar LOGO ou publicar**. `tests/ui/fakes.ts` só conhece a fixture registrada e observa ações da UI; não é parser, motor, conversor ou API de produto. Nenhum fake é importado pelo bootstrap ou pelo artefato.

As capturas de T-066 foram feitas nesse harness e comprovam interface e interação, não execução real de LOGO ou publicação. A T-067 deve repetir fluxos com serviços reais, inclusive PNG com fidelidade do renderer, entrada `?share=`, DPR entre monitores e cancelamento cooperativo. Produção continua exigindo autorização própria da T-069.

## Correção dirigida após composição com o renderer real

O Stage agora observa `.stage`, não o canvas que recebe dimensões inline do renderer. ResizeObserver mede o contêiner; eventos resize da janela e change de uma consulta resolution reinscrita sincronizam DPR quando o tamanho CSS não muda. Todas as assinaturas são removidas no cleanup. O sprite é ocultado se visible=false ou se x/y saírem de 0..500.

O harness passou a usar CanvasRenderer real da T-063; runner/conversor/store continuam fakes identificados. O ensaio novo verifica pixels da mesma linha lógica antes/depois de 1280→360 e DPR2, além da caixa CSS do canvas. Isso substitui a antiga prova insuficiente baseada apenas na porcentagem do sprite.

Falha no carregamento do editor não recomenda recarregar um documento vivo: mostra a fonte atual em textarea somente leitura, selecionável para copiar, e uma tentativa alternativa com query estática própria. A tentativa recebe a fonte atual mesmo depois de edição visual durante a falha. Chrome manteve em cache o import rejeitado da URL inicial; a alternativa recuperou o cenário ensaiado. Dependências compartilhadas ou a própria alternativa também podem continuar em cache de falha: se a alternativa falhar, o botão fica desabilitado e orienta copiar a fonte antes de uma eventual recarga, sem fingir outra requisição. Nenhum loader genérico nem sequência crescente de URLs foi introduzido.
