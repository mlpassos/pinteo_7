# T-066 — verificações da interface

Rodada local de 24/10/2026, Node 24.22.1/npm 11.19.1 em macOS ARM64. Browser: Chromium headless do cache Playwright `chromium_headless_shell-1243`, selecionado explicitamente por `PINTEO7_CHROMIUM`; o pacote instalado também aceita os binários padrão quando disponíveis. Nenhum browser foi instalado nesta frente.

## Resultados

| Comando / verificação | Resultado observado |
| --- | --- |
| `npm run check` | TypeScript strict/core sem DOM, ESLint tipado/hooks/JSDoc, formato e Knip aprovados |
| `npm test` | 99 testes passaram em sete arquivos; seis testes próprios da UI/preferências além da fundação |
| `npm run build` | Sucesso, sem aviso de chunk grande; principal ~353 KiB e editor separado ~331 KiB, antes de gzip |
| `node scripts/check-artifact.mjs` | Assets permitidos por SHA-256; sem PHP, CP7, fixtures ou árvore legada |
| `git diff --check` | Sem erros |
| `PINTEO7_CHROMIUM=<binário existente> npm run test:e2e -- --workers=1` | 13 testes E2E passaram; últimas alterações em Escape/fonte e limite de compartilhamento tiveram três fluxos afetados repetidos, todos aprovados |

A suíte usa `tests/ui/index.html`, não o bootstrap sem serviços. Todas as telas deixam evidente que são serviços de teste. A primeira rodada encontrou perda de retorno de foco no dialog React e supressão excessiva do clique após arrastar; corrigidos e reexecutados. A revisão do coordenador encontrou histórico não limpo, preferências ainda ausentes e Escape confirmando o rascunho de campo durante blur; corrigidos com cenários específicos. Focar/desfocar sem editar também deixou de serializar o documento. Nenhum finding foi ocultado ou aceito como cosmética.

## Cenários efetivamente percorridos

- 360, 412, 768 e 1280 px: gaveta recolhida/aberta, scrollWidth igual ao viewport, canvas quadrado, zero erros/avisos de console nos quatro ensaios. Inspeção visual das capturas desktop e celular, com todos os controles visíveis. A saída/histórico do painel coral não fica cortada.
- Tab/Enter nos comandos e encaixes, inserção dentro de repeat, seleção, Alt+setas mantendo foco, recusa de ciclo sem perda e expressão encaixada em campo.
- Arraste real por mouse até corpo, expressão arrastada até campo, Escape durante gesto mantendo quantidade de blocos; Pointer Events reais por CDP com toque emulado a 412 px inseriu peça. Sem alegar teste em aparelho físico.
- CodeMirror conservou a mesma instância DOM ao abrir/fechar diálogo. Texto com comentário, comando não representável, espaços finais e newline foi preservado ao recusar Blocos. Cancelar Novo mantém o texto.
- Campo 100→999/Escape volta a 100 e a fonte permanece idêntica. Focus/blur sem edição também não altera bytes. Erros de conversão preservam fonte e projeção anteriores.
- Galeria de teste: cancelar substituição conserva rascunho; confirmar abre documento validado e personagem. Requisição cancelada não é usada para sobrescrever fonte.
- Seletor com os 21 personagens, escolha de Capivara, executar/parar via eventos de teste, exportação PNG pelo renderer de teste, compartilhar com aviso público, falha de rede e tentativa novamente até o link de teste.
- Duas execuções seguidas de Limpar retornam histórico a zero, conservando fonte. `clear-text` de LOGO conserva histórico no teste do reducer.
- Som original: evento real `play` de Audio com URL `sounds/click.mp3` observado no encaixe. Silenciar impediu a reprodução seguinte. Isso confirma reprodução no navegador, sem afirmar escuta humana.
- Redução de movimento: toque/encaixe sem animações ativas. Resize de 1280 para 412 preservou as coordenadas percentuais do personagem e o comentário da fonte.
- Preferências: validação estrita, descarte de JSON/propriedades/enum inválidos, tolerância a storage bloqueado/quota; apenas personagem, velocidade e som são gravados. Saída UTF-8 limitada sem caractere partido; projeções/edições antigas recusadas pelo reducer.

## Capturas

- [1280 px](../../../design/reviews/t-066/1280.png), [768 px](../../../design/reviews/t-066/768.png), [412 px](../../../design/reviews/t-066/412.png), [360 px](../../../design/reviews/t-066/360.png).
- Gaveta aberta nas mesmas larguras: `design/reviews/t-066/*-comandos.png`.

## Limites declarados

Não se trata de execução do motor real ou equivalência de conversão: a T-066 usa fakes identificados somente em testes. T-067 precisa validar ponta a ponta com os módulos reais, entrada pública por `?share=`, PNG fiel, cancelamento e resize/DPR real. Toque físico, Safari/WebKit, Firefox, leitor de tela, áudio ouvido por pessoa e auditoria AA completa não foram verificados. Textos e focos têm contraste/controles intencionais; não se declara certificação integral de acessibilidade.

O vídeo e as legendas locais estão integrados com carregamento por demanda, mas não foi feita revisão humana integral da reprodução/qualidade das legendas. Nenhum produto foi publicado, nenhum servidor remoto foi alterado e nenhum fake será usado como backend/motor da release.

## Revisão dirigida Stage/CodeEditor após integração das frentes

Base combinada `03a62a2`, com motor/API e dependências coordenadas. O coordenador reproduziu um canvas real que conservava width/height inline de 350 px ao reduzir o contêiner para 304 px. A observação do próprio canvas escondia o resize do palco. Corrigido para observar o contêiner; acrescentados resize da janela e consulta resolution para mudanças de DPR, com cleanup. O sprite também passa a ser ocultado fora das coordenadas lógicas válidas.

**Três testes dirigidos passaram** em Chromium 153.0.8010.12: (1) CanvasRenderer real mantém pixels da mesma linha lógica e dimensões CSS ao passar de 1280 para 360; DPR2 atualiza backing store, sprite fora do palco é ocultado; (2) abortar o carregamento do editor, editar fonte pelo Visual e tentar novamente recupera exatamente o texto atual, sem reload; (3) abortar também a alternativa mantém fonte copiável e desabilita novas tentativas ineficazes. Capturas do palco real: `design/reviews/t-066/palco-real-1280.png` e `palco-real-360-dpr2.png`.

A alteração de DPR foi feita por CDP e seguida de um evento resize explícito: a emulação não emitiu evento nativo de resolução/resize ao mudar somente o fator. O teste verifica o handler com DPR real=2 no navegador, sem afirmar mudança física de monitor. A recuperação do editor tem uma única URL alternativa; falhas das dependências compartilhadas ou da alternativa podem continuar em cache, mas nenhum código do usuário é descartado ou depende de reload obrigatório para ser copiado.

Após esses fixes, `npm run check` completo, build web/API, allowlist SHA-256 e `git diff --check` passaram na árvore combinada. O editor mantém dependências comuns num chunk e duas entradas pequenas para a carga inicial/alternativa, sem aviso de tamanho. A suíte geral anterior não foi reexecutada nesta frente; o coordenador conduzirá QA conjunto/CI. Nenhum arquivo de dependências, pacote, configuração ou evidência de audit do coordenador entrou no commit desta correção.

## Correção dirigida de foco após edição visual

O QA conjunto do coordenador executou check, 254 testes Vitest, build web/API, TypeDoc e allowlist com sucesso; no E2E geral, 15 de 16 passaram e o cenário de Alt+ArrowUp falhou por uma corrida real: o requestAnimationFrame de uma edição anterior ainda podia focar a peça antiga depois de o usuário já ter escolhido outra.

`App.apply` agora registra o destino antes do dispatch. Um useLayoutEffect consome a solicitação uma única vez após o commit da revisão correta, focando a peça no DOM novo; não há callback de foco da edição pendurado no próximo frame. A microanimação permanece independente de foco tardio. Solicitação de outra revisão ou modo é descartada.

O cenário afetado passou novamente, agora com regressão determinística: o teste segura o próximo requestAnimationFrame, encaixa uma expressão, foca outra peça e libera os callbacks antes de Alt+ArrowUp. O foco permanece na peça escolhida e a ordem muda corretamente. Não foi acrescentado sleep/retry para esconder a corrida. TypeScript e ESLint dos arquivos afetados passaram; `git diff --check` passou. O coordenador repetirá o E2E conjunto; esta frente não declarou a suíte geral aprovada com base no cenário isolado.
