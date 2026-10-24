# Integração e revisão — T-063

Base atualizada com a API integrada em ba3893df (PR #7). O conflito documental ao mesclar foi resolvido preservando tanto operações do Runner quanto limites da API; nenhuma implementação concorrente foi descartada.

Validação conjunta local: npm ci --ignore-scripts/audit completo zero; check (tipos/core sem DOM/lint/formato/Knip); **248 testes em dez arquivos**, sendo102 do motor; build web/API, TypeDoc sem avisos, allowlist e git diff --check aprovados. Entradas públicas logo/runner/canvas foram incluídas na referência; não se excluiu src do Knip.

Revisão independente encontrou três problemas reais: coerção nativa de lista compartilhada em lput podia expandir memória antes do limite; butfirst/butlast não contabilizavam cópias; parse antecipado congelava aridade de procedimento definido em outra execução. Todos corrigidos com testes específicos. Revisão dirigida posterior aprovou cinco regressões e probes independentes: limite de cópias, DAG27 interrompida cooperativamente sem centenas de MiB e caller/callee entre sessões imprimindo7. Não houve regeneração de baseline. Overflow geométrico também recebe diagnóstico antes de emitir estado não finito.

Evidência real Chromium, velocidades e tradeoffs estão em DECISOES.md/browser.json e design/reviews/t-063. Parar foi verificado em código sem desenho, não inferido do teste unitário. A apresentação por comandos usa90/12/1ms conforme escolha autônoma autorizada, sem micropassos de1px.

CI remota e integração serão registradas na fila pelo SHA/run efetivo. Interface final, conversão e deploy continuam nas tasks próprias; este build ainda usa a entrada técnica da fundação.
