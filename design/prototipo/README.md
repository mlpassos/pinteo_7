# Protótipo de layout — T-061, versão 4

Estudo descartável em HTML/CSS/JS, sem dependências. Aguarda aprovação visual de Márcio. Não é implementação do produto.

Na raiz do repositório:

```sh
python3 design/prototipo/preview.py
```

Abrir http://127.0.0.1:8080/. O servidor atende apenas esta pasta, em loopback; Ctrl+C encerra. A porta precisa estar livre. O pequeno helper evita uma consulta de hostname que bloqueou `python3 -m http.server` neste ambiente. Também é possível abrir `index.html` diretamente, sem servidor.

Na v4, o painel inteiro de resultado é a carcaça coral do brinquedo: tela central e controles integrados no topo e na base. Os controles circulares são decorativos e giram durante a animação de execução; não controlam o desenho. Movimento reduzido desliga as animações. Sem seletor de temas nesta rodada.

## O que explorar

- Categorias no topo, expandindo/recolhendo no clique; 19 opções. Metade esquerda para Blocos/Código e metade direita para execução/palco/resultado no desktop.
- Arraste comandos até os encaixes azuis, inclusive dentro de repetições. Blocos existentes podem mudar de ordem/corpo. Som original de encaixe com interruptor.
- Alternativa: selecione um comando com clique ou Enter e depois ative um encaixe. Bloco focado + Alt+seta para cima/baixo reordena entre irmãos.
- Abas Blocos/Código; realce estático e rascunho separado. Setas alternam as abas.
- “Experimentar comando sem bloco” mantém o texto e demonstra a recusa de conversão. Qualquer rascunho editado permanece no Código, pois não há conversor.
- Executar/Parar animam somente a opacidade da ilustração. Limpar oculta a ilustração; Executar a restaura.
- 21 personagens locais, escolha e sorteio.
- Galeria fictícia, ajuda, erro simulado e compartilhamento com falha seguida de nova tentativa. Escape fecha os diálogos.
- No celular, as seis categorias continuam no topo em duas linhas; programa e resultado são empilhados.

O arraste/encaixe é uma demonstração de manipulação DOM, sem modelo ou validação completa de programa. Não há interpretador, conversor, API, armazenamento, download, vídeo ou publicação. Operadores também aparecem como cartões de demonstração; no produto serão expressões encaixadas em slots, conforme contrato. A galeria não abre programas reais. Novo não apaga o rascunho. Campos dos blocos não alteram a fonte nem a geometria. Recarregar retorna ao exemplo inicial. Nenhum dado sai do computador. Os encaixes não sincronizam a fonte ou a ilustração.

Os PNGs em assets/personagens são cópias byte a byte dos 21 assets existentes de images/personagens. O som `assets/click.mp3` é cópia byte a byte de `sounds/click.mp3`, usado pelo legado no encaixe. Não se adicionaram fontes, imagens externas ou bibliotecas. A tipografia usa fontes do sistema neste estudo; Nunito local continua requisito para o produto, com verificação na fundação. Créditos/licenças originais: LICENSE e Papert-License.txt na raiz. A geometria SVG é ilustrativa criada neste estudo. Nenhum CP7 foi carregado.

Decisões, capturas e validações: ../../docs/LAYOUT.md. Evidências: ../reviews/t-061/.
