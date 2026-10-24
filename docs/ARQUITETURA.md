# Arquitetura do refactor

Status: direção aceita em 23/10/2026; contratos são especificação a materializar na T-062, não código existente. Layout v6 aprovado na T-061 e integrado pelo PR #5. T-062 integrada materializou os contratos; T-063 entregou motor/runner/Canvas e T-065 a API. T-064 materializa conversão e importação segura, e T-066 materializa a UI; integração final permanece T-067. Complementa o PRD e substitui as escolhas conflitantes da pesquisa de setembro.

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
public/             apenas assets publicáveis com licença
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

Composição no bootstrap injeta editor/renderizador/storage. Sem service locator, container DI, herança de componentes ou barramento global. Estado do bloco não mora no DOM; JSX renderiza dados. Exemplo a eliminar: os quatro handlers de drop duplicados e `data-*` como fonte de verdade em `js/pinteo7.js`.

Padrões: Interpreter para LOGO; catálogo de comandos; Command para operações da tartaruga; Adapter para canvas/editor/API/CP7; assinaturas de eventos específicas do runner. Strategy somente nas portas que tenham consumidor concreto. Não implementar SVG, plugins ou repositório genérico por antecipação.

## 3. Motor e execução

Portar Papert preservando gramática, aliases, mensagens, semente determinística e semântica caracterizada. Primeiro portar fielmente, depois tornar a execução cooperativa em commit separado. Bugs conhecidos têm caso de referência e decisão explícita; corrigir defeito comprovado com teste dedicado, sem tratá-lo como requisito de produto.

O avaliador cede controle em passos de avaliação e iterações, inclusive sem comando de tartaruga. Um generator apenas em `forward` não atende Q05. Runner consome passos com orçamento de tempo e agenda nova fatia; canvas anima operações em ordem. Sem pausa/step nesta release. O caminho síncrono usado em testes drena o mesmo avaliador com limite, sem segundo interpretador.

Contratos distinguem execução do programa de desenho pendente: `running` só termina quando operações aceitas terminam de desenhar. Cancelar invalida callbacks da execução anterior, esvazia sua fila e preserva o documento fonte. A caracterização fixa o comportamento de estado da tartaruga, variáveis/procedimentos entre execuções e da ação Limpar; não resetar implicitamente ao trocar aba ou velocidade.

Limites iniciais configuráveis: 100 mil passos de avaliação, 100 mil operações de desenho, 20 KiB de saída textual e profundidade de procedimento 200, mais limites de entrada do contrato. Confirmar que todos os exemplos cabem. Ajuste justificado é decisão técnica documentada. Scheduler usa orçamento aproximado de 8 ms por fatia; teste de parada usa limite de resposta do PRD, não precisão artificial de frames.

Tartaruga calcula geometria em coordenadas lógicas do palco legado (500×500); redimensionar altera transformação de apresentação e devicePixelRatio, não o programa ou suas coordenadas. Canvas desenha; sprite HTML acompanha posição/orientação. Log de operações permite redesenho, sem entregar undo ou SVG agora.

## 4. Programa, blocos e fonte de verdade

Texto LOGO é a representação persistida canônica. Modelo de blocos é uma projeção editável associada à revisão do texto, reconstruída ao abrir. Isso evita dois documentos concorrentes e remove a necessidade de persistir HTML ou sincronizar JSON de blocos divergente no servidor. O JSON versionado de programa contém código e personagem; o modelo de blocos também é serializável para testes e futuras migrações, mas não precisa ser salvo em duplicidade.

Ao digitar na CLI, preservar rascunho mesmo inválido. Ao pedir Visual, analisar sintaxe e representabilidade sem executar. Sucesso troca a aba e cria projeção com IDs; falha deixa texto e aba intactos e apresenta diagnóstico. A projeção antiga nunca é usada para sobrescrever fonte nova.

Ao editar blocos, aplicar função pura → gerar nova fonte preservando comentários → validar → confirmar documento e projeção juntos. Não encadear effects que observam texto e blocos e atualizam um ao outro. Alternância sem edição reutiliza a fonte original byte a byte. IDs/spans servem para retenção de comentários e mapeamento de erros, não como formato externo definitivo.

Comentários associados a um bloco acompanham movimentos; comentários de programa permanecem. Exclusão de bloco preserva comentários como texto solto adjacente. Se não for possível preservar um trecho, rejeitar a edição e manter fonte/projeção anteriores. Não aceitar perder conteúdo com base em uma conversão parcial. JSON/source são tratados como dados; `eval`, `new Function` e HTML arbitrário não entram.

Registro de comandos centraliza nome canônico, aliases, aridade e tipos de argumentos. Metadados visuais puros opcionais referenciam o ID (categoria, rótulo pt-BR, slots). React/ícones não entram no core. UI usa esse catálogo, conversor usa assinatura, ajuda gera tabela dele. Comando sem visual continua disponível na CLI.

## 5. Blocos: regras

O modelo e assinaturas estão em [CONTRATOS.md](CONTRATOS.md). Programa tem lista ordenada; `repeat` e definição de procedimento têm corpo; operadores são expressões de valor, não comandos executáveis isolados no novo modelo. Importador identifica operadores soltos antigos e aplica política explícita por fixture, preservando fonte original.

Slots numéricos aceitam número, variável ou expressão aritmética suportada. Cor aceita RGB literal representável no seletor; `setpos` com lista variável não se torna `setxy` automaticamente. Procedimentos visuais são sem parâmetros, como a paleta atual; parametrizados permanecem na CLI. Variáveis não exigem novo bloco `callvar`: são valores selecionáveis nos slots.

Inserir/mover/remover/editar são funções puras. Invariantes: IDs únicos; sem ciclos; um pai por bloco; nenhum procedimento dentro de procedimento; slots respeitam tipos; nenhum mover ancestral para seu descendente. Operação inválida retorna diagnóstico e mantém modelo original.

## 6. React e UX

```text
App (composição dos serviços)
  ProgramProvider (reducer, ações, seletores)
  WorkspacePage
    Toolbar / CharacterPicker / HelpDialog
    CommandPalette
    ProgramPanel
      ModeTabs / ConversionNotice
      BlocksWorkspace → BlockView / ValueField / BodyDropZone
      CodeEditor (adaptador CodeMirror)
      RunControls / TextOutput / HistoryPanel
    Stage (canvas + sprite)
  GalleryPanel (listagem, abertura, paginação)
  ShareDialog
```

Galeria/ajuda podem ser painéis ou páginas conforme T-061; não precisa adicionar router. Link de compartilhamento usa `/?share=<uuid>`; uma nova rota só se o layout aprovado justificar. Sobre é seção de ajuda, não uma nova frente editorial.

Componentes de apresentação recebem dados/callbacks; componentes conectados leem seletores e ações. Exemplos: `ModeTabs({mode,onChange})`, `BlockView({block,selected,onAction})`, `Stage({renderer,characterId})`, `ShareDialog({status,onSubmit,onClose})`. Adapters imperativos têm mount/dispose idempotentes e cleanup; effects só sincronizam sistemas externos. Evitar re-render por pixel/frame; canvas e filas ficam fora do reducer. Contextos separados de documento, execução e preferências reduzem atualizações amplas.

Store: fonte/revisão; projeção ou diagnóstico; modo; personagem; velocidade; seleção; estado do runner; histórico limitado; diálogos. Estado derivável não é salvo duas vezes. Preferências locais guardam apenas personagem/velocidade/som; sem cadastro ou dados pessoais. `CharacterCatalog` é manifesto estático dos 21 assets, não serviço remoto.

## 7. API, arquivos e segurança

HTTP e limites em CONTRATOS. `ShareService` valida e coordena criação/listagem/leitura; `FileShareRepository` não conhece HTTP. UUID via `crypto.randomUUID`; uma pasta por compartilhado com JSON e PNG. Gravar em pasta temporária e renomear só após todos os arquivos estarem prontos, no mesmo filesystem. Listagem ignora staging; concorrência não usa um único JSON mutável global. Uma instância Node é suficiente.

Validar tamanho antes de decodificar, conteúdo/dimensões PNG e reencodar com biblioteca auditada (candidata: sharp 0.35.5). Não carregar URLs recebidas nem executar programas no backend. Limitar POST por IP confiável, capacidade total de dados e filas de processamento. IP de proxy só é confiável vindo do Caddy local; não aceitar X-Forwarded-For arbitrário.

Caddy encaminha API para localhost; dados não são servidos como diretório público. Rota de preview entrega apenas PNG reencodado com tipo fixo e `nosniff`. Escrita exige Content-Type JSON e origem da aplicação quando houver header Origin; CORS não substitui validação/rate limit. API não usa cookies de autenticação; nenhuma rota pública de edição/exclusão. Remoção administrativa valida UUID e fica restrita ao usuário de operação. Logs não incluem código/conteúdo completo nem credenciais.

## 8. Migração

Preservar original e fixtures por hashes antes de mover qualquer coisa. PRs curtos, sem branch longa de reescrita; legado permanece na raiz enquanto módulos novos são construídos/testados. A entrada nova de desenvolvimento pode ficar separada temporariamente; um único produto final. Não colocar a árvore toda em `public/` porque isso publicaria PHP, CP7 e fontes indevidas. Build usa allowlist de assets. Troca da entrada só na integração com paridade comprovada.

CP7 é importado como estrutura inerte e limitada, com allowlist de elementos/atributos conhecidos; rejeitar scripts, handlers, URLs e estilos arbitrários. O resultado é modelo seguro e LOGO. Comparar aos TXT existentes; diferenças reais não são escondidas por snapshots atualizados automaticamente. Preservar TXT original quando for a fonte validada.

## 9. Como expandir depois

- Comando: definição/implementação em `core/logo`, teste e ajuda gerada; visual opcional em catálogo/conversor e testes de ida/volta.
- Personagem: PNG livre conforme guia, entrada no manifesto, teste do seletor; nenhuma classe nova.
- Persistência: nova implementação da porta do repositório, reaproveitando serviço e testes de contrato; PostgreSQL só diante de necessidade concreta.
- Alias pt-BR: registro de alias, lexer/highlight e testes; não traduzir o avaliador inteiro.

Interfaces menores e documentação de módulo são a extensão prevista. Nenhum sistema de plugins, mecanismo de temas ou infraestrutura de contas será criado agora.
