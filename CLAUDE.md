# CLAUDE.md: Pinte o 7

Protótipo de 2013–2016 para ensinar lógica de programação (LOGO) a crianças de 8–12 anos. Estamos refatorando devagar: prefira mudanças pequenas, uma por PR, sem reescrever o que funciona.

Comunicação, commits e textos da interface em pt-BR.

## Rodar localmente

Não tem build nem dependências para instalar. É HTML, CSS e JS estáticos, mais três endpoints PHP.

```bash
python3 -m http.server 8077 --bind 127.0.0.1   # app, sem compartilhar ou salvar
php -S 127.0.0.1:8077                          # app completo, se o PHP estiver instalado
```

Abra `http://127.0.0.1:8077/`. CodeMirror (cdnjs) e Nunito (Google Fonts) vêm de CDN, então é preciso internet.

## Mapa do código

- `index.html`: app principal (palco, editor, blocos, menu de personagens). `welcome.html` é a tela de cadastro, que carrega `header.html`, `wrapper.html` e `footer.html` via `js/welcome.js`.
- `js/pinteo7.js`: lógica da interface, e é o único arquivo carregado. `pinteo7.new.js`, `pinteo7.old.js`, `pinteo7.js.old` e `parser.old` são legado sem uso.
- `js/logo.js`, `js/parser.js`, `js/turtle.js`: interpretador LOGO Papert (Thomas Figg, MIT, ver `Papert-License.txt`) e a tartaruga.
- `save.php` e `listar.php`: salvam e listam os desenhos compartilhados em `compartilhados/` (PNG) e `compartilhados-code/` (código `.txt` e blocos `.cp7`). Não há autenticação nem validação: o `save.php` grava qualquer conteúdo recebido. Não exponha isso em produção sem corrigir.
- `getCidades.php` (usado no cadastro da `welcome.html`) é um esboço inacabado com erro de sintaxe, e hoje não funciona.
- `css/home.css`: estilos principais. `css/welcome.css` não é carregado por nenhuma página.

## Regras de assets (motivo do recomeço)

O repo antigo `mlpassos/pinteo7` foi bloqueado por DMCA em 2019 por conter a fonte comercial FS Joey. Por isso:

- Só entram fontes, imagens e sons com licença livre verificada ou criados por nós. Nada de personagens ou marcas de franquias.
- **Personagens** ficam em `images/personagens/`: PNG 128×128 com fundo transparente, traço grosso e legíveis a 20 px. O topo da imagem é a "frente", porque o sprite gira na direção em que anda. Para adicionar um, crie o `<li>` no menu `#personagem-menu` do `index.html` e em `header.html`. O personagem inicial é sorteado entre os itens do menu.
- **Ícones**: `fonts/icomoon.*` é um subconjunto (38 glifos) da WebHostingHub Glyphs (SIL OFL). Para usar um ícone novo, é preciso gerar o subconjunto de novo a partir da fonte original, ou migrar para outro pacote livre.
- **Fonte do texto**: Nunito (Google Fonts, OFL).
- **Cache**: `css/home.css` e `css/icomoon.css` são carregados com `?v=N`. Ao mudar esses arquivos, aumente o `N` em `index.html` e `welcome.html`.

## Branches e releases

- `main` é sempre publicável e representa a próxima release.
- Todo trabalho vai numa branch curta a partir da `main` (`feat/…`, `fix/…`, `refactor/…`, `docs/…`) e entra por PR. Márcio revisa e faz o merge.
- Release é uma tag `vX.Y.Z` na `main`, com um GitHub Release. O deploy na DigitalOcean vai rodar a partir dessas tags quando o pipeline existir.
- Sem `dev` nem `staging` por enquanto; crie `staging` só quando houver um ambiente de staging de verdade.
- Ainda não há CI nem testes automatizados. Antes de abrir o PR, valide no navegador: o palco desenha, a troca de personagem funciona, e os ícones e a fonte carregam.
