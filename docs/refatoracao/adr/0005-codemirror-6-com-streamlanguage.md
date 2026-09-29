# ADR-0005: CodeMirror 6 com a linguagem LOGO via StreamLanguage

- Status: proposto
- Data: 2026-09-29

## Contexto

CodeMirror 5.3.0 vem do cdnjs (`index.html:16-21`), então o app exige internet, e o modo LOGO é um lexer por estados de 145 linhas (`cm/logo.js`). O CM5 está em manutenção mínima.

## Decisão

CodeMirror 6 (MIT): `codemirror` 6.0.2 mais `@codemirror/language` 6.12.4, `@codemirror/autocomplete` 6.20.3 e `@codemirror/commands` 6.11.1, empacotados pelo Vite. O modo é portado com `StreamLanguage.define()`, quase sem mudança. Uma gramática Lezer fica como passo opcional para erros inline e autocompletar.

## Consequências

- Sai o CDN; o editor funciona offline.
- Alternativas descartadas: Monaco (0.57.0, MIT) por tamanho e workers; `<textarea>` por perder destaque e fechamento de colchetes.
