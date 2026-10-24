# Pinte o 7 — PRD do refactor

Versão 1.0 — 23/10/2026. Escopo e direção aprovados por Márcio nesta conversa; layout final depende da T-061. Documento de planejamento, não evidência de implementação.

## 1. Resultado esperado

Modernizar o Pinte o 7, projeto educacional de LOGO para crianças e jovens, mantendo sua identidade, funcionalidades úteis e patrimônio acadêmico. Entregar uma aplicação em tela inteira, agradável, segura, documentada e fácil de expandir. Público adicional: professores, pesquisadores e visitantes vindos de artigos e vídeos.

Prioridades: preservar programas e comportamento; definir o layout primeiro; separar motor e interface; substituir PHP; publicar uma versão completa com compartilhamento. Oito horas é referência de esforço concentrado, não prazo garantido nem autorização para cortar requisitos.

## 2. Base verificada

Base documental: `main` em `8a1a6aa8fcb8f312df22a5072962fac497497ebd`. Aplicação legada sem build, CI ou testes; 34 conjuntos PNG/TXT/CP7 e 21 personagens. PHP e HTML dos CP7 não podem ser republicados como estão.

O Papert registra 80 operações (62 comandos, oito primitivas e dez comandos de tartaruga), além de constantes, aliases e sintaxe de procedimentos. A paleta ativa tem 19 opções: 17 operações do motor, definir e chamar procedimento. `callvar` no menu está comentado; uso de variáveis nos campos existe. O inventário de setembro que fala em 21 entradas da paleta está impreciso. Operação registrada não significa ausência de bugs.

## 3. Primeira entrega: definição de layout

Antes do código do produto, executar T-061: um protótipo local em HTML/CSS/JS simples, com dados fictícios, personagens existentes e interações simuladas. Objetivo: escolher áreas, proporções, navegação, hierarquia visual, cores, formato dos blocos e estados de feedback.

Produzir uma direção visual bem resolvida, sem múltiplos conceitos ou framework de componentes. Referência de tempo: 45–60 minutos para a primeira apresentação, ajustável se houver impedimento real; não transformar em uma sprint de produto. Não conectar motor, API, servidor ou contas. Botões simulados devem indicar que são demonstração.

Entregáveis futuros: `design/prototipo/index.html`, arquivos locais necessários, `design/prototipo/README.md` e `docs/LAYOUT.md` com capturas, medidas e decisão de Márcio. Nada disso existe na criação deste PRD. Aprovação explícita de Márcio encerra a T-061 e libera o restante da fila. Ajustes visuais atualizam este PRD somente se alterarem um fluxo de produto.

## 4. Requisitos funcionais

| ID | Requisito e aceite |
|---|---|
| F01 | Tela inteira responsiva, com paleta, programa e palco claros; desktop, tablet e celular utilizáveis. Layout final é o aprovado na T-061. |
| F02 | Abas Visual e Código (CLI), editor LOGO com syntax highlight, números de linha, indentação, foco e mensagens em pt-BR. Comandos mantêm nomes/aliases atuais em inglês. |
| F03 | Preservar os blocos de movimento (`forward`, `backward`, `left`, `right`, `setx`, `sety`, `setxy`), desenho (`penup`, `pendown`, `reset`, `color`), `repeat`, `make`, quatro operadores e definir/chamar procedimentos. Inserir, editar, excluir, reordenar e aninhar; valores aceitam números, variáveis e operadores compatíveis. |
| F04 | Converter Visual → Código e Código → Visual integralmente quando representável. Não executar LOGO durante conversão. Em erro ou recurso sem equivalente, manter a CLI e o texto completo; indicar motivo e posição quando disponível. Nenhum bloco genérico de código. |
| F05 | Alternar abas sem editar preserva texto, comentários e formatação exatamente. Editar blocos pode reformatar trechos, preservando comentários. Se uma transformação perder conteúdo/comentário, rejeitar a edição sem alterar o documento. Exclusão explícita de bloco remove apenas o conteúdo indicado e preserva comentários adjacentes. |
| F06 | Preservar comandos/aliases e programas existentes; executar, parar, limpar, velocidades lenta/normal/rápida, saída de texto, histórico e usos atuais de seleção de blocos. Confirmar seleção de execução e seleção usada para criar procedimentos na caracterização, sem inventar depurador. |
| F07 | Manter os 21 personagens, escolha/sorteio, posição, orientação e desenho. Palco responsivo sem mudar a geometria LOGO por redimensionamento. |
| F08 | Baixar PNG, compartilhar programa/desenho sem login, listar e abrir compartilhados. Avisar que compartilhar torna o conteúdo público. Falha de rede preserva código e desenho e permite tentar novamente. |
| F09 | Preservar os 34 conjuntos antigos, com hashes, manifesto e importação segura. Nenhum CP7 entra no DOM como HTML confiável. Divergências TXT/CP7 são registradas e resolvidas explicitamente, sem apagar originais. |
| F10 | Manter ajuda, referência de comandos, vídeo/legendas e sons úteis, com controles acessíveis. Contexto/créditos acadêmicos na ajuda ou seção Sobre simples, sem criar um portal editorial. |

Representabilidade inclui a forma dos argumentos, não apenas o nome do comando. `forward random 100` não é representável pelos blocos atuais; procedimentos parametrizados, listas dinâmicas ou construções fora dos slots suportados permanecem na CLI. Aliases compatíveis (`fw`, `fd`, `rt` etc.) são reconhecidos. Não se promete converter todo LOGO.

## 5. Fora de escopo

Login/cadastro/e-mail, perfis de aluno/professor, integração Moodle, novos comandos ou blocos, Blockly/Scratch, colaboração, gamificação, analytics, tema escuro obrigatório, SVG exportável, undo/redo de desenho, pausa/step/debugger e migração para outro interpretador. Cadastros inacabados e código comentado não se tornam funcionalidades obrigatórias.

## 6. Qualidade e segurança

| ID | Critério |
|---|---|
| Q01 | TypeScript strict, sem `any` explícito/implícito, lint tipado, hooks corretos e fronteiras entre módulos verificadas. |
| Q02 | `npm audit` completo sem vulnerabilidades reportadas na fundação e na entrega, incluindo ferramentas. Sem mascarar findings, `--force` ou exclusões para obter verde. Impedimento upstream real é reportado ao dono, não silenciosamente aceito. |
| Q03 | Dados externos validados; texto renderizado como texto; HTML arbitrário rejeitado; limites de entrada, execução, saída e armazenamento. Sem avaliação JavaScript de código do usuário. |
| Q04 | Teclado, foco visível, rótulos, contraste AA, alvos de toque adequados e movimento reduzido; testar 360, 412, 768 e 1280 px, sem rolagem horizontal da página. |
| Q05 | Loop LOGO sem desenho não bloqueia o botão Parar; cancelamento observado em até 250 ms no cenário de teste local documentado. Limites e erro legível para programas excessivos. |
| Q06 | JSDoc em funções/métodos nomeados, contratos e APIs públicas; `npm run docs` gera referência com TypeDoc. Sem comentários por linha nem meta artificial de cobertura. |
| Q07 | Knip sem arquivos/exports/dependências mortos no escopo de produção final; exceções técnicas explícitas para entradas dinâmicas, nunca exclusão global de src. |
| Q08 | Testes de caracterização, conversão, API e fluxos principais; revisão visual real, sem aprovação baseada apenas em build. |
| Q09 | Instalação reprodutível por lockfile; assets/licenças livres verificados; dependências e scripts de instalação revisados antes de executar. |

## 7. Persistência e publicação

Node com API mínima e arquivos JSON/PNG fora do webroot, sem PostgreSQL, ORM ou Redis. Escrita pública cria compartilhados imutáveis; não permite editar/apagar de terceiros. Remoção administrativa por ferramenta restrita ao servidor, sem painel público. Caddy serve frontend e encaminha `/api/*`, incluindo health, para processo Node local. Release por tag, usuário de serviço sem privilégios, backup e rollback com dados separados das releases.

Servidor, domínio e SSH serão inspecionados na task apropriada: o checkpoint de 22/10 encontrou o app não publicado e sem PHP no host; isso não é atestado de estado atual. Esta rodada de planejamento não autoriza alteração de servidor.

## 8. Conclusão verificável

Entrega completa exige layout aprovado, F01–F10/Q01–Q09 atendidos, testes e auditoria registrados, 34 exemplos preservados, documentação gerada, PHP/jQuery fora do artefato e release publicada/validada após go específico. Artefato pronto sem publicação é um marco intermediário, não a conclusão da meta de entrega no ar.

Referências: [arquitetura](ARQUITETURA.md), [contratos](CONTRATOS.md), [convenções](CONVENCOES.md), [plano e fila](PLANO.md), [decisão consolidada](adr/0013-refactor-enxuto-e-layout-primeiro.md), [pesquisa histórica](refatoracao/README.md).
