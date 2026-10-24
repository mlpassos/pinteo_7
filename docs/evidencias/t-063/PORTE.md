# Porte inicial do Papert — T-063

Primeira mudança separável: parser com AST/spans/comentários, catálogo puro dos 80 registros, avaliador síncrono tipado e geometria sem DOM. Fontes originais permanecem intactas. Licença MIT atribuída nos módulos e preservada em Papert-License.txt.

35 testes verificaram o catálogo e os 34 programas originais contra as capturas da T-062. A comparação normaliza `stroke` sem segmento (pena levantada) para ausência de DrawOp e `fill` branco para `clear`; compara todos os segmentos/arcos, cor, largura, posição e orientação final, com tolerância absoluta menor que5e-10. Baseline original não foi regenerada.

Este commit deliberadamente precede cooperatividade e decisões de correção. Não demonstra ainda cancelamento ou renderer. Bugs last, bitxor, bitand, alias greaterequalp e clean continuam explícitos para a mudança seguinte. Não se reivindica identidade dos detalhes DOM/HTML/temporizadores do legado.

Comandos executados: npm ci --ignore-scripts (240 pacotes auditados, zero vulnerabilidades); npm exec vitest -- run tests/motor; npm run typecheck; ESLint e Prettier nos módulos afetados. Resultados locais passaram. A revisão/CI do lote completo seguem sob coordenação.
