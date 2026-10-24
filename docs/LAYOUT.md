# Layout — T-061, proposta v1

Apresentação em 23/10/2026 (America/Belem). **Aguardando aprovação explícita de Márcio.** T-061 permanece in-progress; T-062–T-069 não iniciadas. A meta persistente está ativa e ainda não foi concluída.

## Direção

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

## Decisão de Márcio

- Versão submetida: **v1**, arquivos em design/prototipo e capturas acima.
- Aprovação: **pendente**; nenhuma mensagem de aprovação recebida.
- Ajustes solicitados: aguardando revisão.
- Gate: somente aceite explícito desta proposta (ou de versão ajustada) encerra T-061 e libera T-062.
