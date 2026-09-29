# ADR-0012: Execução cooperativa por generator, em etapa própria depois do porte

- Status: proposto
- Data: 2026-09-29

## Contexto

`Logo.run` avalia o programa inteiro de uma vez (`js/logo.js:467-490`); `DelayTurtle` só adia o desenho numa fila com `setTimeout` (`js/turtle.js:311-333`). Um `forever` sem `stop` (`js/logo.js:310-323`) ou uma recursão sem fim travam a aba, e "Parar" só esvazia a fila de desenho (`js/init.js:95-103`). O ADR-0002 decide que o porte do motor é 1:1, com o mesmo modelo síncrono, para que a suíte de caracterização valide o porte sem ruído.

## Decisão

- Depois do porte verde, e em etapa própria (etapa 3 do plano), o interpretador ganha uma segunda forma de execução: um generator que cede o controle a cada comando de tartaruga. O `run` síncrono continua existindo e passa a ser "drenar o generator até o fim", então a suíte de caracterização não muda.
- Um `Runner` consome o generator com orçamento de tempo por frame e oferece `start`, `pause`, `resume`, `stop` e `step`, com eventos para a interface.
- As diferenças de comportamento são documentadas em `docs/modulos/runner.md` e cobertas por testes próprios: `forever` e recursão sem fim não travam; "Parar" interrompe na hora; `print` e desenho saem na ordem de execução, frame a frame.
- O adaptador legado continua usando o `run` síncrono; o `Runner` só é ligado à interface na casca React (etapa 6).

## Consequências

- Pausa, passo a passo e parada imediata ficam possíveis sem recriar o interpretador a cada mudança de velocidade (`js/init.js:43-51`).
- Duas formas de execução coexistem no motor; a síncrona é a referência dos testes, a cooperativa é a usada pela interface.
- Alternativa descartada: fazer o porte já como generator, misturando duas mudanças num só diff e deixando os snapshots sem dizer qual das duas causou uma diferença.
