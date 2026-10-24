# Integração e revisão — T-066

Base conjunta atualizada com motor e API integrados em6d1ef995. Conflitos de package/lock/configuração foram resolvidos preservando as três frentes; versões diretas/transitivas conferidas sem atualização. Auditoria e assinaturas da árvore conjunta estão em DEPENDENCIAS.md.

## Evidência conjunta

- Check completo aprovado: TypeScript strict, core sem DOM, lint, formato e Knip. 254 testes em12 arquivos passaram, incluindo motor/API e seis testes de estado/preferências da UI.
- Build web/API separado aprovado; frontend ~355 KiB de entrada, editor em chunk próprio ~329 KiB mais wrappers, sem aviso de chunk grande. TypeDoc dos módulos públicos gerado sem avisos. Allowlist confere assets locais por SHA256; nenhum PHP/CP7/fixture entra no artefato.
- Após a correção final de foco, os16 E2E passaram em12,7s no Chromium local explicitado nas evidências. Não se usa retry/sleep para encobrir a corrida. Formato, build e allowlist foram repetidos após a alteração afetada.
- Capturas reais nas larguras360/412/768/1280 inspecionadas; mouse, teclado, toque emulado, áudio original/silêncio, foco, fonte preservada, erro/retry, renderer real e DPR cobertos no escopo declarado.

## Achados resolvidos e racional

A revisão do coordenador corrigiu Limpar sem reiniciar histórico, falta de preferências e Escape que podia confirmar o campo durante blur. Uma revisão dirigida independente do carregamento assíncrono confirmou StrictMode, import atrasado, callbacks recentes e desmontagem antecipada sem editor residual.

A mesma revisão encontrou canvas preso em350px ao reduzir contêiner a304px: observar o próprio canvas era insuficiente porque o renderer escreve tamanho inline. Stage passou a observar o contêiner e reagir a resize/resolution; sprite fora das coordenadas lógicas fica oculto. O teste usa CanvasRenderer real e verifica pixels. DPR foi emulado por CDP com resize explícito; não se alega troca física de monitor.

Falha de import do editor conserva texto copiável e permite uma URL alternativa estática. Se essa tentativa falhar, o botão é desativado; não se promete limpar o cache de dependências ESM nem se exige reload descartando a fonte. Sem loader genérico ou URLs externas.

A primeira bateria conjunta de16 E2E revelou uma corrida de foco após edição/reordenação (15 passaram). O foco era aplicado por requestAnimationFrame e podia roubar a seleção seguinte. Agora ele acompanha o commit React em useLayoutEffect e é consumido uma vez. A regressão segura callbacks atrasados de propósito e comprova foco/ordem sem espera artificial; a bateria completa passou depois.

## Limites e próximos passos

Testes da interface usam conversor/runner/HTTP identificados como fakes; o renderer já é real nos testes dirigidos. Bootstrap não importa fakes. T-067 conectará serviços reais e validará os fluxos completos, inclusive entrada por link público. Produção não foi alterada. CI/merge serão registrados na fila com os identificadores efetivos.
