# Layout — T-061, propostas v1 a v5

Apresentação em 23/10/2026 (America/Belem). **Aguardando aprovação explícita de Márcio.** T-061 permanece in-progress; T-062–T-069 não iniciadas. A meta persistente está ativa e ainda não foi concluída.

## Direção da v1 (histórico)

Oficina de criação clara, com identidade violeta, fundo neutro e blocos por categoria. Três áreas numeradas: explorar comandos, criar programa e descobrir o desenho. Palco branco com grade discreta e personagem central; nenhuma ilustração externa nova. Controles de execução permanecem no rodapé do programa no desktop. Programa e paleta rolam internamente quando necessário; não exigir que o programa inteiro caiba na tela.

Paleta principal #6343be; movimento #dfedff/#244f88; desenho #f5e4f1/#834375; repetição/procedimentos #fff0d8/#83510c. Violeta identifica a ação primária e a aba ativa. Erros ficam junto ao programa; falhas de compartilhamento ficam no diálogo, preservando o contexto.

Fonte de sistema no protótipo, sem importar assets tipográficos novos. Nunito local continua requisito de implementação; tipografia definitiva e contraste completo serão verificados no produto. Esta apresentação não certifica conformidade AA ou funcionamento com todos os leitores de tela.

## Composição responsiva

| Largura verificada | Composição |
| --- | --- |
| 1280 px | Paleta 224 px; programa e palco dividem o restante com proporção 1:1,04; espaços 18 px; margens 24 px. Altura usa viewport, áreas internas roláveis. |
| 768 px | Paleta 190 px à esquerda; programa e palco empilhados à direita; rolagem vertical da página. |
| 412 / 360 px | Programa e palco empilhados, margens 10 px, espaço 12 px. Paleta recolhida, acionada por “+ Blocos”. Galeria em lista e personagens em três colunas. |

Sem rolagem horizontal da página nas quatro larguras (viewport de altura 900 px). O palco muda de tamanho visual; a grade/figura de demonstração não depende dos valores dos blocos. A implementação usará coordenadas lógicas 500×500 conforme contrato.

## Fluxos apresentados

Visual com repeat aninhado, cor e campos numéricos; 19 opções distribuídas nas seis categorias. Código com números de linha/realce fixos, rascunho editável separado e recusa ilustrativa de comando sem equivalente. Ao editar o rascunho, o protótipo também recusa voltar ao Visual para não dar impressão de conversão real. Textos não são descartados.

Execução/parada/limpeza/velocidade, saída/histórico, escolha/sorteio dos 21 personagens, galeria fictícia, ajuda/referência/sobre e local previsto para vídeo/legendas. Compartilhamento avisa que o conteúdo será público, simula falha e nova tentativa. Todos os diálogos usam dialog nativo. Nenhuma ação publica, baixa arquivos ou executa LOGO.

## Capturas da proposta

- [Desktop, 1280 px](../design/reviews/t-061/1280.png)
- [Tablet, 768 px](../design/reviews/t-061/768.png)
- [Celular, 412 px](../design/reviews/t-061/412.png)
- [Celular, 360 px](../design/reviews/t-061/360.png)
- [Modo Código](../design/reviews/t-061/codigo.png)
- [Erro no programa](../design/reviews/t-061/erro.png)
- [Galeria](../design/reviews/t-061/galeria.png)
- [Personagens](../design/reviews/t-061/personagens.png)
- [Falha de compartilhamento](../design/reviews/t-061/compartilhamento.png)

## Verificações reais

Navegador Chromium via ferramenta Playwright já disponível, sem instalar ferramentas no projeto. Capturas e medidas nas quatro larguras; scrollWidth igual à largura (1280, 768, 412, 360). 21 imagens carregadas sem quebra na rodada final. Console final: zero erros/avisos; rede somente GETs de arquivos locais, todos 200/304.

Percorridos: abas por seta, foco inicial e retorno dos diálogos/Escape, Tab dentro da ajuda, abertura/fechamento da paleta móvel, personagem Capivara, executar/parar/limpar, erro e compartilhamento/falha/nova tentativa. Fonte anterior preservada ao acrescentar cenário random; rascunho `; meu comentário\nprint 42` permaneceu íntegro ao recusar Visual. Emulação de movimento reduzido ativa e CSS desativa animações.

Revisão técnica estática por subagente: um achado P2 sobre rótulos de galeria/ajuda ocultos no celular, corrigido com aria-label estável e conferido no navegador. Sem outros bloqueios reportados. Não houve testes de produto, audit, motor, conversor, API, drag-and-drop ou persistência, pois não pertencem a T-061. Toque físico, Safari/Firefox e leitor de tela real não verificados.

Na primeira tentativa, servidor Python padrão bloqueou a inicialização por resolução de hostname; a tentativa seguinte com servidor de uma conexão teve resets em imagens paralelas. Prévia final usa ThreadingHTTPServer sem resolução reversa, atendendo só o diretório do estudo; rodada final sem esses erros.

## Revisão v2 — solicitação de Márcio em 23/10/2026

A v1 não foi aprovada. Márcio solicitou comandos no topo expandindo no clique, área inferior dividida em duas metades (programa Blocos/Código e visualização/execução/resultado), paleta mais alegre/infantil e reforçou arrastar/encaixar com o som original como obrigação no produto final. Esse aceite funcional foi explicitado em F03 do PRD e R2 da T-066, sem iniciar a implementação.

A **v2** substitui a composição lateral da v1: seis categorias coloridas no topo; novo clique na categoria ou Recolher fecha a gaveta. Grade inferior 1fr/1fr com intervalo 18 px e margens 22 px no desktop/tablet. Em até 650 px, as categorias ficam em duas linhas e as metades empilhadas. Blocos/Código são abas na metade esquerda; Executar/Parar/Velocidade, palco, personagem, exportação/compartilhamento e saída/histórico ficam na metade direita.

Cores da v2: azul #276dcd para movimento, amarelo #ffc83c para repetição, rosa #d63865 para desenho, verde #37b99b para dados e lilás #ae7ee5 para operadores, sobre fundo #f4f8fe. A ação primária usa #1463cf. Tipografia segue de sistema neste estudo.

### Encaixe demonstrável

A v2 permite arrastar comandos da gaveta até encaixes, inclusive em corpos de repetição, e mover blocos existentes. Usa apenas Pointer Events/DOM locais para demonstrar a interação; não é a arquitetura de blocos definitiva. Alternativa por clique/Enter (comando → encaixe) e reordenação de irmãos com Alt+setas. Arraste cancelado preserva o bloco original; mover contêiner para dentro dele mesmo é recusado. O arquivo `assets/click.mp3`, idêntico por SHA-256 a `sounds/click.mp3`, toca no encaixe; há controle de som. `js/pinteo7.js` usa o mesmo asset via clicksound nos handlers de drop do legado.

Sem sincronização entre blocos, fonte e desenho, sem execução LOGO, nem validação completa dos tipos de slots. Em especial, operadores são cartões ilustrativos nesta prévia; o produto manterá os slots e invariantes do contrato. Não confundir o comportamento do mock com aceite do editor final.

### Evidências da v2

- [Desktop recolhido](../design/reviews/t-061/v2/1280.png) e [comandos expandidos](../design/reviews/t-061/v2/1280-comandos.png).
- [Tablet](../design/reviews/t-061/v2/768.png), [412 px](../design/reviews/t-061/v2/412.png) e [360 px](../design/reviews/t-061/v2/360.png); versões expandidas na mesma pasta.
- [Código](../design/reviews/t-061/v2/codigo.png).

Verificados no Chromium disponível: quatro larguras, gaveta aberta/fechada, scrollWidth igual ao viewport, palco quadrado, arraste de paleta para corpo de repeat (6→7 blocos), inserção por clique (7→8), reordenação por mouse sem aumentar a quantidade e por Alt+setas. Toque emulado via Chromium/CDP inseriu um bloco (6→7). Reprodução do áudio confirmou `paused=false` e `error=null`; não há afirmação de escuta humana. Seleção de som alterna aria-pressed. Teclado/Enter insere e conserva foco no bloco novo. Rascunho editado permaneceu íntegro na tentativa de voltar aos Blocos. Console sem erros.

Revisão estática independente da v2 encontrou dois P2: perda de foco após inserir por teclado e seleção pendente de comando ao trocar categoria. Ambos corrigidos e casos reproduzidos novamente: foco no novo bloco, troca de categoria sem inserir seleção oculta. Nenhum outro bloqueio apontado. Toque físico, leitores de tela e outros navegadores continuam não verificados.

## Revisão v3 — molduras mais lúdicas

Em 23/10/2026 Márcio considerou a v2 próxima do desejado, gostou de blocos, som e seletor de personagens e pediu um acabamento mais infantil nas bordas, sobretudo no palco e nas categorias. A referência sugerida foi um brinquedo de desenhar com controles giratórios, ou linguagem de brinquedo/arcade, sem Comic Sans e sem polimento excessivo.

A v3 preserva composição e interações da v2. Acrescenta moldura coral original em HTML/CSS ao palco, dois controles decorativos (sem ação de entrada), pequenos brilhos, bordas azuis mais fortes e fundo creme. Categorias têm contornos na própria cor, cantos variados e sombra de etiqueta/caixinha. A parte inferior ganha bordas mais visíveis nas ações, seletor e saída/histórico. Nenhuma marca, imagem externa, fonte ou dependência nova.

Os controles giram apenas durante a animação ilustrativa de execução; não estão ligados às coordenadas LOGO. `prefers-reduced-motion` desliga essa animação. Temas foram citados pelo usuário como possibilidade; não foram implementados nem adicionados ao escopo de entrega nesta rodada, que prioriza bordas.

Capturas: [1280 px](../design/reviews/t-061/v3/1280.png), [768 px](../design/reviews/t-061/v3/768.png), [412 px](../design/reviews/t-061/v3/412.png), [360 px](../design/reviews/t-061/v3/360.png); gaveta aberta nas mesmas larguras em `design/reviews/t-061/v3/*-comandos.png`.

Verificação proporcional: inspeção visual das molduras em desktop/celular; medições nas quatro larguras com gaveta aberta/fechada sem overflow horizontal e palco quadrado. Console sem erros. Estilo computado dos controles durante execução: `toy-turn`; com movimento reduzido: `none`. Sem mudança no JS de encaixe/som. Não repetida a suíte de interações da v2 porque o comportamento permanece igual. Sem validação em dispositivo físico ou leitor de tela nesta revisão.

## Revisão v4 — o painel inteiro é o brinquedo

Márcio esclareceu que todo o painel “Seu desenho” deve formar o brinquedo, com os controles integrados ao design ou externos. A v4 remove a miniatura de brinquedo interna: a própria borda externa do painel é a carcaça coral, com cantos arredondados e relevo. O palco ocupa a tela clara central. Executar/Parar/Velocidade/Limpar estão no topo da carcaça; personagem, exportação, compartilhamento e saída/histórico compõem a parte inferior. Os dois controles giratórios decorativos ficam nos cantos inferiores, ao lado das ações, sem função de entrada.

Composição geral, categorias, blocos e áudio preservados. Sem temas, novas dependências ou implementação do produto.

Capturas: [1280 px](../design/reviews/t-061/v4/1280.png), [768 px](../design/reviews/t-061/v4/768.png), [412 px](../design/reviews/t-061/v4/412.png), [360 px](../design/reviews/t-061/v4/360.png).

Verificações proporcionais: quatro larguras sem rolagem horizontal da página, inclusive com gaveta expandida; palco quadrado. Seletor com 21 personagens, diálogo de compartilhar acionado no novo painel, saída/histórico expansível e controles decorativos animados durante execução simulada. Console sem erros. Nenhuma mudança no JS de arraste/encaixe/som. Capturas inspecionadas em desktop e celular. Limitações anteriores de protótipo permanecem.

## Revisão v5 — tabuleiro de madeira

Márcio pediu que a metade do programa lembrasse um tabuleiro de madeira onde as peças são movidas com a mão, harmonizando a paleta do site. A v5 usa madeira clara desenhada em CSS, com veios suaves, moldura marrom, rebaixo no tabuleiro e sombras discretas nas peças existentes. Cabeçalho e abas do programa seguem tons de madeira/creme. Fundo global e faixa de demonstração foram aquecidos para combinar com a madeira e a carcaça coral.

O modo Código usa superfície lisa clara para leitura. Não se acrescentaram assets, fontes ou dependências; a textura é composta por gradientes locais. Interações existentes preservadas; a mensagem de encaixe passa a dizer “encaixe destacado”, pois o indicador acompanha a nova paleta.

Capturas: [1280 px](../design/reviews/t-061/v5/1280.png), [768 px](../design/reviews/t-061/v5/768.png), [412 px](../design/reviews/t-061/v5/412.png), [360 px](../design/reviews/t-061/v5/360.png) e [Código](../design/reviews/t-061/v5/codigo.png).

Validação proporcional: inspeção de desktop/celular, quatro larguras com gaveta aberta/fechada sem rolagem horizontal. Inserção por seleção e encaixe aumentou 6→7 blocos; áudio com `paused=false` e sem erro. Console sem erros/avisos e `node --check` aprovado. Não houve mudança no mecanismo de arraste nem nova validação em dispositivo físico.

## Decisão de Márcio

- Versão submetida agora: **v5**; anteriores preservadas nos commits e capturas.
- Aprovação: **pendente**. Pedido de ajuste não constitui aceite final.
- Ajuste desta rodada: tabuleiro de madeira e harmonização dos tons, aplicado.
- Gate: aceite explícito da versão visual encerra T-061; T-062 permanece não iniciada.
