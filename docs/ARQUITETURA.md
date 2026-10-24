# Arquitetura do Pinte o 7

Estado em 24/10/2026: implementação integrada até T-067 (`ef680594`), versão 1.0.0 registrada em `f844d71`. Layout v6 aprovado na T-061; T-062 estabeleceu fundação/caracterização, T-063 motor/runner/Canvas, T-064 conversão/importação, T-065 API, T-066 UI e T-067 composição/migração reais. Complementa o PRD e mantém as decisões de outubro, substituindo escolhas conflitantes da pesquisa histórica. Produto pronto localmente; publicação ainda não feita, sujeita ao go da T-069. QA final de release da T-068 é registrado separadamente.

## 1. Estrutura e dependências

Um pacote npm, frontend Vite e processo Node separados em runtime. Sem monorepo, SSR ou framework full-stack.

```text
src/
  core/
    logo/           tokenizer, parser, AST, comandos e interpretador Papert
    turtle/         estado, geometria e operações de desenho
    program/        blocos, conversão e documento fonte
  application/      runner, ações e serviços de aplicação
  infrastructure/   canvas, CodeMirror, importador CP7 e cliente HTTP
  ui/               componentes, hooks, reducer/contextos e CSS
  server/           HTTP, validação, armazenamento e operação administrativa
  shared/           schemas e DTOs de programa/compartilhamento
tests/              fixtures, unitários, integração e E2E
web/                entrada Vite; assets locais entram por imports autorizados
design/prototipo/    estudo visual separado do produto
docs/               produto, contratos, decisões, evidências e referência
```

- `core` depende apenas de módulos puros do próprio core; nenhum DOM, React, IO ou servidor.
- `shared` contém contratos puros e schemas Zod; pode usar tipos puros do core, nunca implementações de UI/IO.
- `application` depende de core/shared e declara portas de saída.
- `infrastructure` implementa portas da aplicação e pode usar DOM/HTTP; não importa UI/server.
- `ui` compõe aplicação/adaptadores na raiz; módulos de domínio nunca a importam.
- `server` usa shared e módulos próprios. Não importa frontend ou executa LOGO recebido.
- ESLint restringe imports por camada e imports internos entre módulos. Cada módulo expõe sua API em `index.ts`; imports internos relativos dentro do mesmo módulo são permitidos.

## 2. Princípios aplicados

Função pura para converter programa, validar drop ou calcular geometria. Classe/objeto com ciclo de vida para editor, canvas, runner e arquivos. Interface quando existe fronteira de IO, fake de teste ou implementação alternativa concreta; não criar `IService` para toda função.

Composição no bootstrap injeta editor/renderizador/storage. Sem service locator, container DI, herança de componentes ou barramento global. Estado do bloco não mora no DOM; JSX renderiza dados. A UI nova usa o modelo tipado para edição; os handlers e `data-*` de `js/pinteo7.js` permanecem apenas no legado caracterizado.

Padrões: Interpreter para LOGO; catálogo de comandos; Command para operações da tartaruga; Adapter para canvas/editor/API/CP7; assinaturas de eventos específicas do runner. Strategy somente nas portas que tenham consumidor concreto. Não implementar SVG, plugins ou repositório genérico por antecipação.

## 3. Motor e execução

Papert foi portado em etapas separadas: porte tipado confrontado ao harness real dos 34 exemplos, seguido de cooperatividade e correções documentadas. Gramática, aliases, semente determinística e semântica de sessão têm testes; bugs caracterizados e correções ficam em [decisões do motor](evidencias/t-063/DECISOES.md). Mensagens novas de diagnóstico são em pt-BR, com spans quando disponíveis. Não tratar defeito comprovado como requisito de produto.

O avaliador cede controle em passos de avaliação e iterações, inclusive sem comando de tartaruga. Um generator apenas em `forward` não atende Q05. Runner consome passos com orçamento de tempo e agenda nova fatia; canvas anima operações em ordem. Sem pausa/step nesta release. O caminho síncrono usado em testes drena o mesmo avaliador com limite, sem segundo interpretador.

Contratos distinguem execução do programa de desenho pendente: `running` só termina quando operações aceitas terminam de desenhar. Cancelar invalida callbacks da execução anterior, esvazia sua fila e preserva o documento fonte. A caracterização fixa o comportamento de estado da tartaruga, variáveis/procedimentos entre execuções e da ação Limpar; não resetar implicitamente ao trocar aba ou velocidade.

Limites configuráveis por execução: 100 mil passos, 100 mil operações de desenho, 100 mil itens de listas alocados, 20 KiB de saída textual e profundidade de procedimento 200; fonte até 20 KiB UTF-8. Os 34 exemplos cabem nos limites padrão. Coerções, cópias e crescimento de listas também consomem orçamento; números e geometria não finitos são recusados. Scheduler usa orçamento aproximado de 8 ms por fatia; testes de parada observam resposta inferior a 250 ms, inclusive laços sem desenho.

A unidade visual desta release é o comando: lenta aguarda 90 ms, normal 12 ms e rápida processa lotes com espera de 1 ms. Velocidade muda agendamento, sem alterar geometria/estado. O legado segmentava movimentos em passos de 1 px; esta entrega não promete interpolação contínua. Essa diferença foi aceita e documentada, preservando cancelamento e log simples.

Tartaruga calcula geometria em coordenadas lógicas do palco legado (500 × 500); redimensionar altera transformação de apresentação e devicePixelRatio, não o programa ou suas coordenadas. Canvas desenha; sprite HTML acompanha posição/orientação. Log de operações permite redesenho, sem acrescentar controles de undo na UI ou exportação SVG.

## 4. Programa, blocos e fonte de verdade

Texto LOGO é a representação persistida canônica. Modelo de blocos é uma projeção editável associada à revisão do texto, reconstruída ao abrir. Isso evita dois documentos concorrentes e remove a necessidade de persistir HTML ou sincronizar JSON de blocos divergente no servidor. O JSON versionado de programa contém código e personagem; o modelo de blocos também é serializável para testes e futuras migrações, mas não precisa ser salvo em duplicidade.

Ao digitar na CLI, preservar rascunho mesmo inválido. Ao pedir Visual, analisar sintaxe e representabilidade sem executar. Sucesso troca a aba e cria projeção com IDs; falha deixa texto e aba intactos e apresenta diagnóstico. A projeção antiga nunca é usada para sobrescrever fonte nova.

Ao editar blocos, aplicar função pura → gerar nova fonte preservando comentários → validar → confirmar documento e projeção juntos. Não encadear effects que observam texto e blocos e atualizam um ao outro. Alternância sem edição reutiliza a fonte original byte a byte. IDs/spans servem para retenção de comentários e mapeamento de erros, não como formato externo definitivo.

Comentários associados a um bloco acompanham movimentos; comentários de programa permanecem. Exclusão de bloco preserva comentários como texto solto adjacente. Se não for possível preservar um trecho, rejeitar a edição e manter fonte/projeção anteriores. Não aceitar perder conteúdo com base em uma conversão parcial. JSON/source são tratados como dados; `eval`, `new Function` e HTML arbitrário não entram.

`core/logo/catalog.ts` contém o catálogo puro de 80 operações: nome canônico, aliases, aridade e categoria de execução, além dos operadores infixos. Tipos de valores são validados pelo avaliador/conversor. A paleta tipada em `ui/blocks/catalog.ts` contém 19 opções e seus valores iniciais; apresentação/slots ficam na UI. O conversor resolve aliases pelo catálogo LOGO e aceita somente formas visuais explícitas. Não há geração automática de ajuda a partir desse catálogo nesta release; alterações precisam manter catálogos, editor e documentação coerentes. React/ícones não entram no core. Comando sem visual continua disponível na CLI.

## 5. Blocos: regras

O modelo e assinaturas estão em [CONTRATOS.md](CONTRATOS.md). Programa tem lista ordenada; `repeat` e definição de procedimento têm corpo; operadores são expressões de valor, não comandos executáveis isolados no novo modelo. Importador identifica operadores soltos antigos e aplica política explícita por fixture, preservando fonte original.

Slots numéricos aceitam número, variável ou expressão aritmética suportada. Cor aceita RGB literal representável no seletor; `setpos` com lista variável não se torna `setxy` automaticamente. Procedimentos visuais são sem parâmetros, como a paleta atual; parametrizados permanecem na CLI. Variáveis não exigem novo bloco `callvar`: são valores selecionáveis nos slots.

Inserir/mover/remover/editar são funções puras. Invariantes: IDs únicos; sem ciclos; um pai por bloco; nenhum procedimento dentro de procedimento; slots respeitam tipos; nenhum mover ancestral para seu descendente. Operação inválida retorna diagnóstico e mantém modelo original.

## 6. React e UX

```text
main.tsx (composição: LogoRunner, conversor, HTTP, createRenderer)
  App (reducer de documento/revisão e estado de interface)
    Paleta de comandos / seletor de personagem / controles
    BlockWorkspace → BlockView / ValueEditor / destinos tipados
    CodeEditor → import assíncrono do adaptador CodeMirror
    Stage → canvas + sprite + prévia PNG validada
    Modal → Gallery / Share / ajuda / confirmação de substituição
```

Não há router nem container DI. O link `/?share=<uuid>` carrega fonte/personagem e prévia, sem executar LOGO. Antes da substituição, a composição valida resposta/ID e imagem limitada. Se o usuário já alterou o rascunho durante a rede, pede confirmação. Falha preserva fonte e desenho; fechar a galeria invalida a aplicação tardia.

App coordena transições síncronas no reducer e IO nos handlers/efeitos. Projeção é vinculada à revisão da fonte. Código/dados não ficam no DOM. Histórico é limitado a 100 entradas; preferências locais guardam somente personagem, velocidade e som. O catálogo de personagens é estático, com 21 IDs; não há cadastro/dados pessoais.

Editor e renderer têm cleanup; import tardio do CodeMirror não monta após desmontagem e recebe o draft/foco/diagnóstico atuais. Stage observa contêiner e DPR, revoga URLs de objeto e libera assinaturas/renderizador. Canvas e agendamento ficam fora de React, sem renderização por pixel. A composição é dona do runner: `pagehide` sem BFCache faz dispose; documento preservado em BFCache apenas interrompe execução.

Compartilhamento é gesto explícito, com aviso de conteúdo público. A prévia recebida pode ser exportada sem executar a fonte; executar ou Limpar a descarta. Os efeitos assíncronos conferem montagem/versão antes de aplicar resultados. HTTP usa respostas limitadas e timeout; imagens são buscadas apenas em rota local conhecida, com limite de bytes/dimensões, timeout e decode antes de entrar no palco.

## 7. API, arquivos e segurança

HTTP e limites em CONTRATOS. `ShareService` valida e coordena criação/listagem/leitura; `FileShareRepository` não conhece HTTP. UUID via `crypto.randomUUID`; uma pasta por compartilhado com JSON e PNG. Gravar em pasta temporária e renomear só após todos os arquivos estarem prontos, no mesmo filesystem. Listagem ignora staging; concorrência não usa um único JSON mutável global. Uma instância Node é suficiente.

Validar tamanho antes de decodificar, conteúdo/dimensões PNG e reencodar com sharp 0.35.5, dependência verificada. Não carregar URLs recebidas nem executar programas no backend. Limitar POST por IP confiável, capacidade total de dados e filas de processamento. IP de proxy só é confiável vindo do Caddy local; não aceitar X-Forwarded-For arbitrário.

Na publicação planejada, Caddy encaminhará a API para loopback; essa configuração não foi implantada nesta etapa. No desenvolvimento, Vite faz o proxy same-origin. Dados não são servidos como diretório público. Rota de preview entrega apenas PNG reencodado com tipo fixo e `nosniff`. Escrita exige Content-Type JSON e origem da aplicação quando houver header Origin; CORS não substitui validação/rate limit. API não usa cookies de autenticação; nenhuma rota pública de edição/exclusão. Remoção administrativa valida UUID e fica restrita ao usuário de operação. Logs não incluem código/conteúdo completo nem credenciais.

## 8. Migração

Originais foram copiados para fixtures imutáveis com manifesto SHA-256 antes da importação; os 34 trios PNG/TXT/CP7 e os 21 personagens permanecem preservados. Papert original e UI antiga continuam disponíveis ao harness, sem runtime PHP/jQuery no produto. O build parte de `web/index.html`, com `publicDir` desativado; `dist/web` contém somente bundles e assets conhecidos, conferidos por allowlist/hash. A raiz não é webroot.

CP7 é analisado offline como estrutura inerte e limitada: allowlist de elementos/atributos, recusa de scripts/handlers/URLs/estilos arbitrários e confronto ao TXT canônico. Diferenças estão documentadas, sem esconder divergências por atualização automática de snapshots. `--check` confere derivados; regeneração exige manutenção explícita e revisão.

O build da API copia 69 derivados conhecidos (manifesto, 34 documentos e 34 PNGs) para `dist/api/examples/`. A CLI `import-examples` exige API parada, diretório externo privado, trava e backup novo verificado antes de journal/obras. Publicação é individual por staging/rename; journal permite retomada sem sobrescrever. Não há atomicidade global dos 34 itens nem promessa de durabilidade sob queda elétrica. Operação e recuperação estão em [migração T-067](evidencias/t-067/MIGRACAO.md).

## 9. Como expandir depois

- Comando: catálogo/implementação em `core/logo`, testes semânticos e documentação; visual opcional exige modelo/conversor/paleta/slots e testes de ida/volta, conforme [COMANDOS](COMANDOS.md).
- Personagem: PNG livre conforme guia, entrada no manifesto, teste do seletor; nenhuma classe nova.
- Persistência: nova implementação da porta do repositório, reaproveitando serviço e testes de contrato; PostgreSQL só diante de necessidade concreta.
- Alias pt-BR: registro de alias, lexer/highlight e testes; não traduzir o avaliador inteiro.

Interfaces menores e documentação de módulo são a extensão prevista. Nenhum sistema de plugins, mecanismo de temas ou infraestrutura de contas será criado agora.
