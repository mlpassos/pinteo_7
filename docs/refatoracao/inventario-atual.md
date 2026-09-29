# Inventário do código atual

Levantamento feito em 29/09/2026 sobre o commit `b582715`. Cada afirmação cita `arquivo:linha`. Contagens vêm de `wc -l` e `grep -c`.

## 1. Tamanho e composição

| Arquivo | Linhas | Papel |
|---|---|---|
| `js/pinteo7.js` | 2811 | Toda a interface, num único `$(document).ready` (`js/pinteo7.js:73-2812`) |
| `js/logo.js` | 715 | Interpretador Papert: primitivas, comandos, `run`, `eval`, `SymbolTable` |
| `js/parser.js` | 309 | `Parser`, `Tokenizer`, `ListTokenizer`, `Token`, `Command` |
| `js/turtle.js` | 399 | `Turtle` (canvas + sprite) e `DelayTurtle` (fila de comandos) |
| `js/init.js` | 110 | Ponte entre editor, interpretador e canvas: `init`, `setup`, `run`, `stop`, `clearcanvas` |
| `cm/logo.js` | 145 | Modo CodeMirror 5 para LOGO (lexer por estados) |
| `js/welcome.js` | 423 | Tela de cadastro e login (`welcome.html`), sem autenticação real |
| `index.html` | 842 | Página principal, com o guia LOGO embutido em `<pre>` (`index.html:620-841`) |
| `css/home.css` | 1395 | Estilos principais, layout fixo de 1000 px |
| `css/papert.css` | 140 | Colunas do palco e do editor |
| `save.php`, `listar.php`, `getCidades.php` | 40, 28, 10 | Backend |

Legado sem uso, candidato a remoção: `js/pinteo7.new.js`, `js/pinteo7.old.js`, `js/pinteo7.js.old`, `js/parser.old`, `js/intro.js`, `js/highlight.pack.js`, `js/jquery-ui.js`, `css/welcome.css`, `css/buttons.css`, `css/introjs.css`, os 48 temas em `styles/` e `sounds/index.html`.

## 2. Ordem de carga e dependências

`index.html` carrega, nesta ordem: CodeMirror 5.3.0 e quatro addons via cdnjs (`index.html:16-21`); `cm/logo.js` (`index.html:23`); Nunito do Google Fonts (`index.html:27`); os CSS (`index.html:28-34`); prefixfree, jQuery 1.9.1, jQuery UI 1.10.4, Touch Punch, fancyBox e bxSlider (`index.html:36-42`); Playr (`index.html:44`); o motor `turtle.js`, `parser.js`, `logo.js`, `init.js` (`index.html:45-48`); e por fim `pinteo7.js` (`index.html:49`). O Google Analytics `UA-68656926-2` é carregado em `index.html:118-124` e grava cookies. O Universal Analytics foi descontinuado pelo Google em 2023, então esse script não coleta mais nada.

Nota: o `CLAUDE.md` diz que `pinteo7.js` é o único JS de interface carregado. `init.js` também é carregado e faz a ponte com o motor. Isso deve ser corrigido no `CLAUDE.md` quando a issue for fechada.

### Globais compartilhados

- `init.js` declara `turtle`, `logo`, `canvas`, `form`, `sprite`, `textOutput`, `oldcode`, `fast`, `out` e `DelayTurtle` (`js/init.js:1-10`). O `var DelayTurtle;` sobrepõe a função de `js/turtle.js:301`; funciona só por hoisting.
- `pinteo7.js` cria os globais implícitos `cm` (`js/pinteo7.js:82`), `comandos` (`js/pinteo7.js:308`, reatribuído a cada clique em `js/pinteo7.js:791`), `slider` (`js/pinteo7.js:476`), `len` (`js/pinteo7.js:753`) e `index` (`js/pinteo7.js:1857`).
- Dependência circular: `init.js` lê o editor `cm` da interface (`js/init.js:53`, `js/init.js:60`), e `pinteo7.js` chama `init`, `run`, `stop`, `setup` e `clearcanvas` (`js/pinteo7.js:75`, `js/pinteo7.js:728`, `js/pinteo7.js:2099`, `js/pinteo7.js:2112`).
- Atributos inline no HTML usam o global `canvas` (`index.html:408`, `index.html:448`).
- `turtle.js` cria os globais implícitos `prev`, `curr`, `next` e `old` (`js/turtle.js:59-71`, `js/turtle.js:248`).

## 3. Motor: interpretador e parser

### Estrutura

- `Logo` mantém `functions` e `values` (duas `SymbolTable`), um `Tokenizer`, um `Parser`, e tabelas `primitive`, `command`, `turtle_command`, `constant` e `alias`, todas `Array` usadas como mapa (`js/logo.js:17-28`). Profundidade máxima de recursão 200 (`js/logo.js:33`).
- Registro de comandos por `addCommand(nome, aridade, aliases, fn)` (`js/logo.js:53`), `addPrimitive` para os que não avaliam argumentos (`js/logo.js:58`), `addTurtleCommand` para os que despacham direto na tartaruga (`js/logo.js:68`) e `addInfix` com precedência (`js/logo.js:63`). A aridade é registrada no parser (`js/logo.js:74`).
- `run(code)` carrega o tokenizador, chama `turtle.start()`, avalia até `eof` e chama `turtle.finish()` (`js/logo.js:467-490`). Retorna um `Token` de erro ou `null`.
- `eval` (`js/logo.js:493-654`) despacha por `code.type`: `def` grava a função; `lst` avalia a lista; `wrd`/`ops` resolve alias, constante, primitiva, comando, comando de tartaruga ou função do usuário; `var` lê a `SymbolTable`; `num`/`sym` devolve o dado.
- Funções do usuário são parseadas de forma tardia a partir de `f.raw` na primeira chamada (`js/logo.js:544-560`) e têm otimização de recursão em cauda (`js/logo.js:592-628`).
- O tokenizador é um conjunto de regex sobre a string restante (`js/parser.js:258-265`): operadores e as palavras `to`/`end` (`js/parser.js:258`), palavras `[a-zA-Z.]\w*\??` (`js/parser.js:259`), variáveis `:x` (`js/parser.js:260`), números (`js/parser.js:261`), símbolos `"x` (`js/parser.js:262`) e comentários `;` (`js/parser.js:265`). **Identificadores aceitam só ASCII**, então `"maçã` ou `:ângulo` falham com "I can't understand this" (`js/parser.js:308`), a única mensagem de erro em inglês.
- O parser (`js/parser.js:21-190`) trata parênteses (`js/parser.js:37-71`), listas (`js/parser.js:72-92`), definições `to … end` (`js/parser.js:93-150`), o "grab" de argumentos por aridade (`js/parser.js:151-170`) e infixos por precedência (`js/parser.js:171-187`). Procedimentos aninhados são rejeitados (`js/parser.js:135`).

### Comandos (o inventário que vira testes)

Todos os nomes são em inglês. Não há alias em português em nenhum arquivo. O pt-BR está nas mensagens de erro (por exemplo `js/logo.js:86`, `js/logo.js:408`, `js/parser.js:52`) e nos rótulos dos blocos.

| Grupo | Comandos e aliases | Onde |
|---|---|---|
| Movimento | `forward` (`fw`, `fd`), `backward` (`bw`, `bk`, `back`), `right` (`rt`), `left` (`lt`), `setx`, `sety`, `setheading` (`seth`), `setxy`, `setpos`, `home` | `js/logo.js:85-127`, `js/logo.js:172` |
| Caneta e tela | `penup` (`pu`), `pendown` (`pd`), `color` (`colour`), `penwidth` (`setpensize`), `hideturtle` (`ht`), `showturtle` (`st`), `clearscreen` (`cs`, `clear`), `clean`, `reset`, `undo`, `redo` | `js/logo.js:170-193` |
| Desenho | `arc`, `circle` | `js/logo.js:158-168` |
| Texto | `print` (`pr`), `cleartext` (`ct`) | `js/logo.js:129-155` |
| Listas | `first` (`head`), `last`, `butfirst` (`tail`, `bf`), `butlast` (`bl`), `item`, `setitem`, `empty?` (`emptyp`), `fput`, `lput`, `array` | `js/logo.js:198-209`, `js/logo.js:275-281` |
| Matemática | `int`, `round`, `sqrt`, `power` (`pow`), `exp`, `ln`, `log10`, `sin`, `cos`, `arctan`, `radsin`, `radcos`, `radarctan`, `random` (`rand`), `rerandom` (`srand`), `bitand`, `bitor`, `bitxor`, `bitnot`, `sum` (`add`), `difference` (`sub`), `product` (`mul`), `divide` (`div`), `modulo` (`mod`, `remainder`), `minus` | `js/logo.js:211-240` |
| Infixos | `+ - * / %` e `= != <> < > <= >=` | `js/logo.js:244-248`, `js/logo.js:262-268` |
| Lógica e comparação | `or`, `and`, `not`, `equal?` (`equalp`), `notequal?`, `less?`, `greater?`, `greaterequal?`, `lessequal?` | `js/logo.js:251-260` |
| Variáveis | `make`, `global`, `output` (`op`), constantes `stop`, `true`, `false` | `js/logo.js:283-311`, `js/logo.js:242`, `js/logo.js:270`, `js/logo.js:461-462` |
| Controle | `forever`, `do.until`, `do.while`, `until`, `while`, `repeat`, `if`, `ifelse`, `to … end` | `js/logo.js:310-458`, `js/parser.js:93-150` |

O `random` usa um gerador congruencial próprio com semente no relógio (`js/logo.js:36-43`), o que é bom para testes: `rerandom` torna a saída determinística.

### Bugs latentes no motor

Registrados aqui para virarem testes de caracterização, e não para serem corrigidos silenciosamente na migração.

- `last` devolve `b[b.length]`, sempre `undefined` (`js/logo.js:199`).
- `bitxor` usa `|`, igual ao `bitor` (`js/logo.js:230`).
- O alias de `lessequal?` é `greaterequalp`, que sobrescreve o alias de `greaterequal?` (`js/logo.js:259`, `js/logo.js:258`).
- Ao parsear uma função do usuário, a variável `ret` é atribuída sem `var` (`js/logo.js:553`).
- `Turtle.prototype.clean` não chama `clean_` (falta `()`, `js/turtle.js:245`).
- `right` e `left` giram o `#turtle` via jQuery com `+90`/`-90` antes de atualizar o ângulo (`js/turtle.js:214`, `js/turtle.js:222`), e depois `update` roda o sprite de novo por `setAttribute('transform', …)`, que não tem efeito num `<embed>` (`js/turtle.js:95`).

## 4. Motor: tartaruga e palco

- `Turtle` recebe o canvas e o elemento do sprite; lê `offsetTop`/`offsetLeft` só na construção (`js/turtle.js:11-12`) e busca `#sprite` direto no DOM (`js/turtle.js:21`).
- Estado: `x`, `y`, `angle`, `pen`, `visible`, `lineWidth` e `strokeStyle` do contexto (`js/turtle.js:281-286`). `home` é o centro, ângulo 270 (`js/turtle.js:274-278`). A cor é `rgb(r,g,b)` (`js/turtle.js:148`).
- Desenho: `crawl` traça um segmento por `forward` (`js/turtle.js:186-206`); `arc` e `circle` usam `ctx.arc` (`js/turtle.js:151-179`).
- Sprite: `update` posiciona `#turtle` por `style.left/top` com deslocamento fixo de 10 e 20 px (`js/turtle.js:91-100`) e esconde quando sai do canvas.
- `DelayTurtle` embrulha uma `Turtle` e transforma cada comando em `DelayCommand` numa fila (`js/turtle.js:290-337`). `paint` consome a fila com `setTimeout(speed)`, dez itens por tick quando `speed <= 1` (`js/turtle.js:315-333`). Com `drawbits`, `forward` vira um `crawl` por pixel e `circle` vira 360 `arc_point` (`js/turtle.js:341-391`). O sprite fica visível só na velocidade 25 (`js/turtle.js:308`).
- Velocidades usadas pela interface: 25 (lento), 5 (normal) e 1 (rápido) (`js/pinteo7.js:2148`, `js/pinteo7.js:2210`, `js/pinteo7.js:2272`).
- Undo e redo são esqueletos comentados (`js/turtle.js:32-53`).
- O canvas é fixo em 500×500 (`index.html:440`, `js/init.js:28-32`, `js/init.js:108`) e não há redimensionamento.
- `init.js` também tem interface: abre um diálogo jQuery UI com o erro do motor (`js/init.js:65-87`), anima o histórico `#oldcode` (`js/init.js:55-56`) e recria o `DelayTurtle` quando a velocidade muda (`js/init.js:43-51`). O segundo parâmetro de `run` se chama `drawbits` aqui e `showturtle` em `Executar` (`js/pinteo7.js:721`).

## 5. Interface (`js/pinteo7.js`)

### Organização

Tudo fica dentro de um `$(document).ready` de cerca de 2740 linhas (`js/pinteo7.js:73-2812`). Não há módulos, IIFE nem objetos. Dois blocos comentados de integração com Moodle ocupam `js/pinteo7.js:1-70` e `js/pinteo7.js:110-257`.

| Intervalo | Responsabilidade |
|---|---|
| `js/pinteo7.js:75-94` | `init(...)`, `clearcanvas()` e criação do CodeMirror com `mode:'logo'` |
| `js/pinteo7.js:259-280` | Sons de clique e exclusão (`sounds/click.*`, `sounds/delete.*`) |
| `js/pinteo7.js:308-409` | Objeto `comandos`: 21 entradas `{element, text, command}`, com o rótulo em pt-BR e o comando LOGO em inglês |
| `js/pinteo7.js:445-486` | fancyBox, listagem AJAX de `listar.php` e bxSlider |
| `js/pinteo7.js:489-547` | `carregaExemplo()`: sorteia um compartilhado e carrega `.txt` no editor e `.cp7` nos blocos |
| `js/pinteo7.js:550-718` | `BlocksParser`: blocos → texto LOGO, recursivo |
| `js/pinteo7.js:721-761` | `Executar(velocidade, showturtle)`: gera o código dos blocos ou usa o editor e chama `run` |
| `js/pinteo7.js:763-909` | `checkForMoves`: redeclara todos os `#valor_*` e o objeto `comandos` a cada clique |
| `js/pinteo7.js:911-1035` | `updateDataCode` e os handlers dos campos `contenteditable` |
| `js/pinteo7.js:1039-1555` | `ativarRepeat`, `ativarProcedimentos`, `ativarVariavel`, `ativarOperadores`, `ativarInputs`: draggable/droppable/sortable por tipo de bloco |
| `js/pinteo7.js:1557-1786` | `adicionarCodigo`: cria o `<li>` do bloco por concatenação de HTML, ou insere texto no editor no modo CLI |
| `js/pinteo7.js:1789-1882` | Menu principal, submenus e vínculo id do menu ↔ nome do comando (`'#'+value`, `js/pinteo7.js:1876`) |
| `js/pinteo7.js:1885-1928` | Diálogo de personagem, sorteio inicial e troca do `src` |
| `js/pinteo7.js:1931-2044` | Diálogo de ajuda, dicas e vídeo |
| `js/pinteo7.js:2096-2139` | `sacudirTela()` e `reiniciar()` (alterna Executar/Parar) |
| `js/pinteo7.js:2142-2328` | Handlers `#lento`, `#normal`, `#rapido`, quase idênticos |
| `js/pinteo7.js:2390-2487` | Droppable/sortable raiz de `#codeblocks`, lixeiras, alternância PV/CLI (`js/pinteo7.js:2434-2458`) |
| `js/pinteo7.js:2490-2570` | Carregar um compartilhado |
| `js/pinteo7.js:2573-2811` | Compartilhar (`#like`): POST em `save.php`, relistar e reativar os plugins |

### Estado

Não existe um objeto de estado. O estado mora no DOM:

- Modo blocos ("PV") ou linha de comando ("CLI"): `$('#codeblocks').is(':hidden')` (`js/pinteo7.js:727`, `js/pinteo7.js:1568`, `js/pinteo7.js:2144`) e `css('display')` (`js/pinteo7.js:2436`). O modo inicial é CLI porque `#codeblocks` nasce com `display:none` (`css/home.css:1111-1117`).
- Executando ou parado: classe `.reset` no botão e `.anima` no sprite (`js/pinteo7.js:2111-2135`).
- Personagem atual: o `src` de `#turtle>embed` (`js/pinteo7.js:1919`, `js/pinteo7.js:1925`).
- Programa: o texto do editor e o HTML de `#codeblocks`.
- Modelo dos blocos: atributos `data-code`, `data-loops`, `data-what`, `data-value`, `data-amount`, `data-posx`, `data-posy`, `data-valor1`, `data-valor2` (`js/pinteo7.js:911-947`, `js/pinteo7.js:1572-1650`).
- Não há `localStorage`, `sessionStorage` nem cookies próprios.

O "modo aluno" e o "modo professor" existem só em `welcome.html`: `EscolherPerfil` (`js/welcome.js:119-379`) abre formulários diferentes, mas "Entrar" não autentica (`js/welcome.js:227`) e "Começar!" faz `$('html').load('index.html')` (`js/welcome.js:142`). O app principal não distingue os perfis.

### Sistema de blocos

- Os blocos não vêm de uma paleta arrastável. Um clique no menu chama `adicionarCodigo`, que monta o `<li>` como string (`js/pinteo7.js:1572-1650`). Tipos: `funcao-repeat`, `funcao-procedimento`, `funcao-call`, `funcao-make`, `funcao-operadores`, `funcao-movimento`, `funcao-solta` e o bloco de cor com `style=background-color` (`js/pinteo7.js:1595`).
- Contêineres aninhados: `ol.codeblocks-repeat` e `ol.codeblocks-procedimento`.
- Arrastar um valor, variável ou operador sobre um campo `div.numero` troca o conteúdo e chama `updateDataCode`. O handler está copiado quatro vezes (`js/pinteo7.js:1079-1143`, `js/pinteo7.js:1294-1358`, `js/pinteo7.js:1477-1542`, `js/pinteo7.js:1667-1731`).
- Usos ativos de jQuery UI: 11 `draggable`, 7 `droppable` e 8 `sortable`; a configuração do `sortable` está copiada sete vezes (`js/pinteo7.js:1145`, `1171`, `1199`, `1222`, `2400`, `2694`, `2767`).
- Tradução só em uma direção: blocos → LOGO por `BlocksParser` (`js/pinteo7.js:550-718`), que sobrescreve o editor ao executar (`js/pinteo7.js:737-746`). Não existe LOGO → blocos; carregar blocos depende do HTML salvo no `.cp7`.
- O formato `.cp7` é o `innerHTML` de `#codeblocks` (`js/pinteo7.js:2617`), com jQuery UI destruído antes para "limpar" (`js/pinteo7.js:2582-2584`). Exemplo real em `compartilhados-code/NomeDoAluno-02-07-2015-1435796325.cp7`; o `.txt` correspondente tem o LOGO gerado.

### Contagens em `js/pinteo7.js`

| Padrão | Total | Fora de comentários |
|---|---|---|
| `$(` | 590 | 444 |
| `.dialog(` | 41 | 37 |
| `.delegate(` | 28 | 28 |
| `.draggable(` / `.droppable(` / `.sortable(` | 12 / 8 / 12 | 11 / 7 / 8 |
| efeitos (`animate`, `fadeIn`, `slideDown`, `toggle`, `effect`…) | ~27 | ~22 |
| `innerHTML` ou `.html(` | 35 | 15 |
| `alert(` | 110 | 3 |
| `setTimeout` | 3 | 2, ambos com bug: `setTimeout($(this).dialog('close'), 3000)` fecha na hora (`js/pinteo7.js:2514`, `js/pinteo7.js:2540`) |
| `eval(`, `document.write`, `setInterval` | 0 | 0 |

### Duplicações e bugs de interface

- `hexToRgb` definida duas vezes (`js/pinteo7.js:1585`, `js/pinteo7.js:1744`).
- Diálogo "Não sei o que fazer…" copiado seis vezes (`js/pinteo7.js:2150-2303`).
- Montagem da lista de compartilhados em três lugares (`js/pinteo7.js:459-472`, `js/pinteo7.js:2627-2636`, `js/welcome.js:257-269`), sem escapar os nomes de arquivo.
- Títulos trocados: `divide` aparece como "Somar" e `product` como "Diminuir" (`js/pinteo7.js:1619`, `js/pinteo7.js:1635`).
- `'rotate(0deg'` sem parêntese (`js/pinteo7.js:2101`).
- `#limparTela` limpa duas vezes: `onClick` inline (`index.html:454`) e delegate (`js/pinteo7.js:2330`).
- `ativarOperadores` não é reativado depois de compartilhar (`js/pinteo7.js:2668-2671`, `js/pinteo7.js:2719-2781`).
- `header.html` e `wrapper.html` são versões antigas do menu, já divergentes de `index.html` (`header.html:205-216` tem itens que não existem no app; `header.html:239-245` tem id duplicado).
- `welcome.html` tem ids duplicados (`#idade`, `#valorIdade`, `#lstCidade`), um id impróprio `#cu` (`welcome.html:235`, `js/welcome.js:40`) e imagens do `placehold.it`, serviço extinto (`welcome.html:111`, `welcome.html:126`). Além disso carrega `js/pinteo7.js` sem canvas nem CodeMirror (`welcome.html:30`), o que dispara `alert('sem codemirror')` (`js/pinteo7.js:93`).

## 6. Editor

- CodeMirror 5.3.0 é criado sobre `textarea#code` com `autoCloseBrackets`, `matchBrackets`, `lineNumbers` e `mode:'logo'` (`js/pinteo7.js:82-88`).
- `cm/logo.js` é só um lexer por estados (`normal`, `defn-name`, `defn-vars`, `defn-body`; `cm/logo.js:7`), com indentação de 2 espaços por `[`/`]` e `TO`/`END` (`cm/logo.js:28-44`). Reconhece apenas `TO`, `END`, `TRUE` e `FALSE` como palavras-chave; todo o resto é `logo-word` (`cm/logo.js:126-133`). Aceita identificadores com acentos (`cm/logo.js:12`), ao contrário do tokenizador do motor.
- Escritas no editor pela interface: `cm.setValue` em sete pontos (`js/pinteo7.js:505`, `746`, `1742`, `1753-1762`, `1783`, `2420`, `2499`).

## 7. Salvar, compartilhar e listar

- "Gravar como PNG" é um `onClick` inline com `canvas.toDataURL()` (`index.html:448`).
- "Compartilhar" (`js/pinteo7.js:2574-2811`) exige código no editor (`js/pinteo7.js:2577`) e faz POST em `save.php` com `data` (PNG base64), `conteudo_logo` (texto) e `conteudo_cp7` (HTML dos blocos) (`js/pinteo7.js:2611-2618`).
- `save.php` decodifica o PNG com GD (`save.php:3-5`), grava `compartilhados/NomeDoAluno-d-m-Y-<time>.png` (`save.php:23`, `save.php:31`) e os arquivos `.txt` e `.cp7` em `compartilhados-code/` (`save.php:24-30`). O nome do aluno é fixo (`save.php:17`). `time()` é chamado três vezes, então os três nomes podem divergir na virada do segundo (`save.php:23-25`). Falhas não retornam erro HTTP (`save.php:33`, `save.php:38`).
- Problemas de segurança: sem autenticação, sem limite de tamanho, sem verificação de método. `conteudo_cp7` é HTML arbitrário que volta para todos os visitantes via `.load()` em `#codeblocks` (`js/pinteo7.js:513`, `js/pinteo7.js:2507`), inclusive automaticamente por `carregaExemplo` ao abrir o app (`js/pinteo7.js:489-513`). É XSS armazenado. O próprio código anota o risco (`save.php:21-22`). Não há path traversal, porque os nomes são gerados no servidor, e o PNG é reencodado.
- `listar.php` lê a pasta com `readdir` e devolve um JSON com `.` e `..` incluídos (`listar.php:15-17`, `listar.php:26`); o cliente filtra (`js/pinteo7.js:460`).
- `getCidades.php` não roda: `codigoEstado = $_POST['estado']` sem `$` nem `;` (`getCidades.php:2`), `$results_array` indefinido (`getCidades.php:5`) e o cliente envia GET (`js/welcome.js:100-115`).

## 8. Layout e CSS

- Sem flex nem grid: `display:flex` e `display:grid` aparecem zero vezes em `css/home.css`; há 9 `float`, 21 `position:absolute` e 321 valores em `px`.
- Largura fixa: `.wrapper {width:1000px}` (`css/home.css:321-325`); colunas por float e margem negativa em `css/papert.css:15-27` e `css/papert.css:61-71` (`margin-left:-945px`).
- Cabeçalho fixo de 100 px (`css/home.css:1127-1138`).
- Zero `@media`: o layout não se adapta a tablet nem a celular.
- 52 ocorrências de `!important` (45 fora de comentários).
- 11 `@keyframes` próprias, entre elas `shake`, `pulse`, `bounceIn` e `animaPersonagem` (`css/home.css:136-300`, `css/home.css:1272`). Nada respeita `prefers-reduced-motion`.
- Fontes: Nunito (`css/home.css:355`) e a fonte de ícones `icomoon` (`css/home.css:470`, `css/icomoon.css`).
- Texto de interface em pt-BR está espalhado pelo HTML (`index.html:137-179`, `index.html:188-397`, `index.html:422-427`) e pelo JS (`js/pinteo7.js:311-407`, `js/pinteo7.js:1572-1604`, `js/pinteo7.js:1890-2001`, `js/pinteo7.js:2150-2303`, `js/pinteo7.js:2437-2445`, `js/pinteo7.js:2587-2787`).

## 9. Bibliotecas em uso e situação

| Biblioteca | Carregada? | Uso real | Licença |
|---|---|---|---|
| jQuery 1.9.1 | sim | tudo | MIT |
| jQuery UI 1.10.4 | sim | draggable, droppable, sortable, dialog, tooltip, effects | MIT |
| Touch Punch | sim | toque no jQuery UI | MIT |
| CodeMirror 5.3.0 (CDN) | sim | editor | MIT |
| fancyBox 2.1.5 | sim | `.fancyimages` (`js/pinteo7.js:445-452`) | CC BY-NC 3.0 |
| bxSlider | sim | carrossel de compartilhados (`js/pinteo7.js:476-483`) | MIT |
| Playr | sim | vídeo tutorial (`index.html:479-483`, `js/playr.js:1083-1084`) | MIT |
| prefixfree | sim | nada útil hoje | MIT, arquivado |
| Intro.js 1.0.0 | não | só um `// introJs().start()` (`js/pinteo7.js:530`) | MIT (`js/intro.js:4`) |
| highlight.js | não | comentado (`index.html:50-51`) | BSD-3-Clause |
| Google Analytics | sim | rastreio (`index.html:118-124`) | — |

## 10. Assets

- 21 personagens em `images/personagens/`, listados em `index.html:513-617` e em `header.html`. O sprite inicial é `rato.png` (`index.html:438`), depois sorteado (`js/pinteo7.js:1913-1919`).
- Sons: `sounds/click.{mp3,ogg,wav}` e `sounds/delete.{mp3,ogg}`.
- Vídeo: `videos/blockprog.mp4`, com legendas em `legendas/pt-br.vtt` (não usadas pelo player atual).
- 34 desenhos compartilhados em `compartilhados/` e 68 arquivos em `compartilhados-code/`, versionados no repo. São bons programas de referência para os testes.
