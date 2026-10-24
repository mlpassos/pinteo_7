# Decisões técnicas para o porte após caracterização

Márcio reforçou nesta conversa que ajustes pequenos, incluindo velocidade, podem ser decididos pelo time, com racional nos relatórios. A v6 já está aprovada. Estas são decisões de implementação para T-063 e integração; não alegam correções já entregues na fundação.

- Velocidade altera somente agendamento/animação. Não recriar a tartaruga ou resetar cor/posição/pena ao trocar. Geometria fracionária deve ser igual em lenta/normal/rápida; eliminar o arredondamento para cima observado na lenta. Motivo: preferência de reprodução não deve modificar o programa. Testar mesmo percurso e estado nas três velocidades.
- Corrigir `last`, `bitxor`, `greaterequalp` e registrar `lessequalp` coerente com os aliases canônicos; corrigir `clean` que não chama o método interno. Casos do legado continuam preservados; novos testes documentarão o resultado correto.
- Erros de variável inexistente e valores inválidos devem virar diagnóstico pt-BR; sem TypeError/HTML do legado. Erro preserva fonte e desenho já aceito; não executar setup implicitamente para apagar a sessão. Operações já executadas não terão rollback artificial.
- Limpar da UI limpa tinta/saída/histórico e reinicia ambiente/tartaruga, preservando fonte, como o botão ativo observado. Comando LOGO reset preserva ambiente/saída conforme referência, mas reinicia desenho/tartaruga. Parar preserva desenho já feito e invalida a fila; cancelar loop sem desenho é obrigatório.
- Executar usa programa completo: seleção de trecho para execução não existe na entrada ativa. Criar procedimento começa com corpo vazio que recebe blocos. Não acrescentar execução parcial ou “extrair seleção” por interpretação da pesquisa histórica. Seleção de peças para edição acessível continua permitida na UI conforme necessidade.

As correções devem ser separadas do porte fiel para manter revisão e comparação úteis. Nenhuma alteração material de produto está sendo antecipada; produção ainda exige o go previsto.
