# ADR-0008: API Node com Hono e Zod, armazenamento em disco, sem HTML no compartilhamento

- Status: proposto
- Data: 2026-09-29

## Contexto

`save.php` grava qualquer conteúdo sem validação, sem limite e sem checar método (`save.php:3-31`), e o `conteudo_cp7` é HTML que volta para todos os visitantes via `.load()` (`js/pinteo7.js:513`, `js/pinteo7.js:2507`): XSS armazenado. O droplet não tem PHP e tem Node 22 (`CLAUDE.md`, "Deploy").

## Decisão

- `api/` em Hono 4.13.10 com `@hono/node-server` 2.1.1 (MIT), validação com Zod 4.6.5 (MIT), três rotas (`POST /api/shares`, `GET /api/shares`, `GET /api/shares/:id`).
- Armazenamento em disco com IDs gerados no servidor; PNG reencodado ou validado por assinatura, limites de tamanho, rate limit por IP.
- O compartilhamento envia LOGO em texto e blocos em JSON; HTML nunca é aceito nem devolvido. Os `.cp7` antigos são migrados por script.
- Caddy faz `reverse_proxy` de `/api/*` e o `redir` 301 do caminho antigo.
- `LocalShareStore` em `localStorage` mantém o app útil no deploy estático, sem API.

## Consequências

- Compartilhar volta a funcionar em produção, o que hoje é impossível sem PHP.
- Alternativas descartadas: Fastify 5.12.5 (MIT) é boa opção se a API crescer; Express 5 sem vantagem em TypeScript; SQLite (`better-sqlite3` 13.0.3, MIT) só se precisar de índice ou busca; `node:sqlite` ainda não é estável no Node 22 e 24.
