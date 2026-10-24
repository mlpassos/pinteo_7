# Protótipo de layout — T-061, versão 1

Estudo descartável em HTML/CSS/JS, sem dependências. Aguarda aprovação visual de Márcio. Não é implementação do produto.

Na raiz do repositório:

```sh
python3 design/prototipo/preview.py
```

Abrir http://127.0.0.1:8080/. O servidor atende apenas esta pasta, em loopback; Ctrl+C encerra. A porta precisa estar livre. O pequeno helper evita uma consulta de hostname que bloqueou `python3 -m http.server` neste ambiente. Também é possível abrir `index.html` diretamente, sem servidor.

## O que explorar

- Categorias e inserção ilustrativa de comandos; 19 opções.
- Abas Visual/Código; realce estático e rascunho separado. Setas alternam as abas.
- “Experimentar comando sem bloco” mantém o texto e demonstra a recusa de conversão. Qualquer rascunho editado permanece no Código, pois não há conversor.
- Executar/Parar animam somente a opacidade da ilustração. Limpar oculta a ilustração; Executar a restaura.
- 21 personagens locais, escolha e sorteio.
- Galeria fictícia, ajuda, erro simulado e compartilhamento com falha seguida de nova tentativa. Escape fecha os diálogos.
- No celular, “+ Blocos” abre a paleta acima do programa.

Não há drag-and-drop, interpretador, conversor, API, armazenamento, download, vídeo ou publicação. A galeria não abre programas reais. Novo não apaga o rascunho. Campos dos blocos não alteram a fonte nem a geometria. Recarregar retorna ao exemplo inicial. Nenhum dado sai do computador.

Os PNGs em assets/personagens são cópias byte a byte dos 21 assets existentes de images/personagens. Não se adicionaram fontes, imagens externas ou bibliotecas. A tipografia usa fontes do sistema neste estudo; Nunito local continua requisito para o produto, com verificação na fundação. Créditos/licenças originais: LICENSE e Papert-License.txt na raiz. A geometria SVG é ilustrativa criada neste estudo. Nenhum CP7 foi carregado.

Decisões, capturas e validações: ../../docs/LAYOUT.md. Evidências: ../reviews/t-061/.
