# Aceite do Pinte o 7

Registro local em 24/10/2026. Layout v6 aprovado por Márcio (“Aceito”). T-063, T-064, T-065 e T-066 estão integradas; T-067 conectou os serviços reais e passou no QA conjunto local. Esta matriz distingue evidência já executada de verificação ainda pendente. Produção não foi alterada.

| Requisito | Evidência disponível | Estado da integração |
|---|---|---|
| F01 — tela inteira responsiva | Capturas 360/412/768/1280 e E2E da T-066 | Aprovado localmente; build final limpo na T-068 |
| F02 — Visual e Código | CodeMirror local e testes de foco/recuperação T-066 | Aprovado com conversor real no E2E |
| F03 — 19 opções e encaixe | Mouse, teclado, toque emulado e som original T-066; todos os tipos no conversor T-064 | Aprovado com fonte real e interação por teclado/mouse/toque emulado |
| F04 — conversão integral | 91 testes T-064, 34 TXT representáveis, recusa de formas incompatíveis | Aprovado com aliases, comentários e recusa integral |
| F05 — fonte/comentários | Patches locais, comparação exata e 38 probes independentes T-064 | Aprovado; resposta tardia exige confirmação |
| F06 — execução/sessão | Motor comparado ao Papert, cancelamento/limites/velocidades T-063 | Aprovado; executa fonte inteira, sessão e histórico preservados |
| F07 — 21 personagens e palco | Assets locais, resize/DPR com CanvasRenderer real T-066 | Aprovado nas quatro larguras, com coordenadas reais |
| F08 — PNG/galeria/share | API HTTP/disco real T-065; cliente HTTP validado contra API/repositório reais | Aprovado: PNG, falha/retry, paginação, reload e preview sem execução |
| F09 — 34 exemplos | Originais/hashes/33 equivalências e uma divergência explícita T-064 | Aprovado: backup, retomada e colisão; CLI compilada 34 novos / 34 reutilizados |
| F10 — ajuda/créditos | Ajuda, referência, vídeo/legendas, áudio e licença Nunito T-066 | Recursos locais aprovados; vídeo avançou e legenda carregou no Chromium |
| Q01 — TS strict/fronteiras | Check T-064/T-066 aprovado; core sem DOM/Node | Check integrado aprovado |
| Q02 — audit completo | Instalação conjunta com scripts desativados, audit zero | Aprovado na instalação limpa da T-068: zero vulnerabilidades |
| Q03 — dados/limites | Parser/motor/importador/API e cliente HTTP validam fronteiras | Revisão dirigida concluída, três achados corrigidos |
| Q04 — acesso/responsividade | Teclado/foco/redução de movimento/toque emulado/quatro larguras T-066 | Capturas inspecionadas; contraste dirigido corrigido; limites abaixo |
| Q05 — Parar responsivo | Chromium real T-063, cenário local abaixo de 250 ms | Botão integrado parou loop sem desenho; métrica local T-063 preservada |
| Q06 — docs/JSDoc | TypeDoc dos módulos públicos gerado em T-064/T-066 | TypeDoc gerado e guia COMANDOS.md atualizado |
| Q07 — Knip | Check conjunto T-064 aprovado, sem exceção global de src | Knip integrado aprovado |
| Q08 — testes e revisão | Caracterização/conversão/API/UI e revisões dirigidas registradas | 403 testes e 24 E2E conjuntos aprovados |
| Q09 — reprodução/licenças | Lock fixado; dependências/licenças/scripts/assinaturas revisados | Licenças/avisos conferidos; pacote final em fechamento na T-068 |

## Decisões de produto preservadas

O programa LOGO é a fonte canônica. Abrir uma obra pública não executa seu código automaticamente. A prévia pode ser exibida sem simular a execução; executar/limpar assume o palco local. Recusa de conversão ou falha de rede conserva o rascunho. Não há bloco genérico, login, PHP novo ou banco.

A madeira e a moldura de brinquedo usam CSS e SVG originais locais. A escolha mantém textura, volume, foco e adaptação à tela com uma implementação pequena; não acrescenta motor 3D à interação educacional. Movimento é reduzido quando solicitado pelo sistema. Os comandos executam no ritmo documentado na T-063, sem interpolação contínua prometida para trajetos longos.

## Limitações a manter explícitas

Toque físico, leitores de tela, Safari/Firefox, troca física de monitor e revisão humana integral do vídeo/legendas ainda não foram verificados. Emulação de toque/DPR é identificada como tal. Não se declara certificação integral de acessibilidade nem garantia universal de tempo de resposta. A T-068 registra instalação limpa e oito E2E do build real; pacote e publicação têm identificação e gate próprios.


## Resultado conjunto da T-067

403 testes Vitest e 24 E2E passaram localmente. Check, conferência dos originais/derivados, build web/API, TypeDoc, allowlist e audit completo passaram. A revisão de HTTP/prévia encontrou três falhas corrigidas antes da integração; o relatório registra os probes e seus limites. O smoke da CLI compilada criou 34 exemplos, repetiu sem duplicação e listou 34 pela API HTTP real.

O vídeo local foi reproduzido sem áudio até 0,248s no Chromium: metadados 1920×1080, duração 263,03s, uma faixa de legenda e três cues carregados, sem erro de mídia. Isso confirma reprodução inicial/recursos, não revisão humana integral do conteúdo/legendas. Evidências em docs/evidencias/t-067/ e capturas em design/reviews/t-067/.


## Verificação da candidata 1.0.0

Instalação limpa: 259 pacotes, 259 assinaturas e 105 atestações; audit completo zero. Check, 403 testes, build, TypeDoc, conferência dos 34 conjuntos e allowlist aprovados. Oito E2E sobre dist/web + API compilada passaram em portas isoladas; quatro larguras foram repetidas após o último ajuste de contraste dos rótulos na madeira. Evidências: docs/evidencias/t-068/VERIFICACOES.md e design/reviews/t-068/. Inventário/termos completos em docs/LICENCAS.md e licenses/.

A revisão técnica do pacote/configs está registrada em docs/evidencias/t-068/REVISAO.md. A preparação dos diretórios privados da primeira instalação foi explicitada no plano. Caddy passou em adaptação local; systemd/host/Linux/HTTPS externos permanecem para depois do go. Nenhuma publicação foi realizada.
