# Migração administrativa dos 34 exemplos — T-067

Implementação local, sem acesso a produção. Entrada: os 34 documentos/PNGs derivados e auditados na T-064; originais TXT/CP7/PNG e seus hashes permanecem intactos. A migração não passa pela API pública nem contorna seu rate limit com um loop de POST: é uma operação offline do usuário de serviço, sob a mesma trava exclusiva da API.

## Executar e retomar

Com a API parada, use as variáveis administrativas já documentadas (`PINTEO7_DATA_DIR`, `PINTEO7_PUBLIC_ORIGIN`, quota opcional) e:

```sh
npm run admin -- import-examples /caminho/privado/backup-novo
```

O destino de backup precisa ser absoluto, novo, com pai existente e fora do diretório de dados e da release/webroot. Não existe argumento de caminho para carregar CP7, um catálogo externo ou programas arbitrários. O comando lê exclusivamente os 69 nomes fixos do catálogo derivado conhecido: manifesto, 34 documentos e 34 PNGs. O build coloca esses arquivos em `dist/api/examples/`, fora de `dist/web/`; a resolução do módulo compilado usa `import.meta.url`, sem depender de HTTP ou de um caminho enviado pelo usuário. Os testes TypeScript apontam explicitamente para os mesmos derivados da árvore fonte.

API para composição/testes locais:

```ts
importPreparedExamples({
  dataDirectory: string,
  backupDestination: string,
  quotaBytes?: number,
}): Promise<Result<MigrationSummary>>
```

Sucesso informa `imported`, `reused`, `total: 34` e correspondências `exampleId`/`shareId`. Nova execução em dados já migrados retorna zero novas obras e 34 reutilizadas, sem atualizar registros existentes. Cada execução exige outro destino novo de backup; não reutilize nem sobrescreva a primeira cópia.

## Ordem real das garantias

1. Valida a allowlist e os 34 documentos por `programDocumentSchema`; lê arquivos regulares limitados sem seguir links. PNGs passam pelo mesmo `sanitizePng` da API (assinatura, bytes, dimensões, decoder e reencode), sequencialmente. Não executa LOGO.
2. Resolve os caminhos físicos, adquire `.instance-lock` e verifica eventual manifesto existente contra o dataset da release. Trava ocupada ou drift não escreve obras.
3. Inventaria os arquivos privados por SHA-256 incremental e cria backup novo por `FileShareRepository.backup`. Compara inventário/hash/tamanho do backup com a origem, excluindo apenas a trava operacional. Divergência ou falha de cópia interrompe antes de mudar o journal ou qualquer obra.
4. Grava `.examples-import-v1.json` em arquivo temporário exclusivo, sincroniza seu conteúdo e publica por rename atômico. Esse journal reserva os **34 IDs antes do primeiro share** e contém versão, hash do dataset, timestamp da migração, hashes dos documentos/PNGs de entrada e status/hash de PNG publicado por exemplo.
5. Publica cada obra pela mesma transação de arquivos, quota e rename do repositório. `createImported` aceita o UUID/timestamp previamente reservados, recusa um diretório UUID já existente e não é exposto em endpoint HTTP.
6. Confirma o hash do PNG publicado no journal após cada registro. Conclusões e temporários também contam na quota; falta de espaço produz falha controlada, preservando obras e backup.

UUIDs são v8 derivados de SHA-256 de namespace fixo + `example-NN`. Assim, novas tentativas ou instalações mantêm os mesmos IDs sem usar nomes pessoais/datas dos arquivos legados. `createdAt` representa o momento administrativo reservado no primeiro journal, e não uma autoria/data inferida. Os documentos conservam a fonte e o personagem preparados na T-064.

## Interrupções e conflitos

Não há atomicidade global dos 34 registros. Depois de uma interrupção podem existir N obras completas e um journal parcialmente confirmado. São válidas e permanecem imutáveis; a retomada não as apaga para "começar de novo".

- **Antes do rename da obra:** o UUID ainda não existe. A retomada usa o mesmo ID reservado e novo staging exclusivo; resíduos da execução anterior ficam privados e não são apagados automaticamente.
- **Depois do rename, antes de atualizar o journal:** o registro completo já existe. A retomada confronta ID/timestamp/documento e pixels da prévia com o exemplo reservado, confirma seu hash e contabiliza reutilização. Não publica outra cópia.
- **Depois da confirmação:** confere documento e hash armazenado do PNG. Compressão nativa pode variar entre hosts; para uma confirmação pendente, igualdade usa pixels/canais/dimensões, sem exigir bytes de PNG recém-reencodados idênticos. Um registro confirmado continua sendo conferido pelo hash real previamente gravado.
- **Journal/entrada divergente, obra concluída ausente, diretório parcial ou UUID ocupado por outra obra:** falha explícita; nunca atualiza ou substitui o registro. Remoção administrativa intencional de um exemplo confirmado não é revertida automaticamente numa nova execução.

Temporários de journal e staging de queda são incluídos no backup e na quota. A limpeza exige inspeção do operador, sem apagar dados de outra sessão. Uma trava residual após término abrupto exige verificar o PID/processo antes de remoção manual. Quota insuficiente pode exigir ampliação justificada ou revisão de resíduos; a ferramenta nunca apaga obras para abrir espaço.

## Backup e rollback

A criação/liberação da trava e a preparação de diretório privado vazio são infraestrutura operacional; o backup verificado ocorre antes de qualquer alteração em journal/share. A primeira cópia preserva o estado anterior à migração. Cópias de retomada preservam adicionalmente o progresso já publicado; mantenha também a primeira e uma cópia externa ao host conforme a política operacional.

Para rollback de dados, mantenha a API parada, preserve o estado atual, restaure uma cópia íntegra para pasta privada nova e altere a configuração do diretório de dados. Não misture arquivos de versões diferentes nem execute remoção em massa por uma lista incompleta. Rollback de código permanece separado dos dados.

Como no repositório, sincronização de arquivos + rename protege a publicação diante de falha de processo/IO, sem prometer durabilidade de metadados do filesystem sob perda elétrica. Backup verificado continua obrigatório. Não foi executado rollback nem migração de produção nesta task.

## Verificações locais

`npm exec vitest -- run tests/api/migration.test.ts`: 10 testes aprovados em 13,41 s na execução registrada, com diretórios/arquivos/repositório reais:

- 34 registros e fonte/PNG reabertos, preservando obra alheia e backup anterior à mutação.
- Segunda execução idempotente, sem novos UUIDs/registros.
- Estados de interrupção simulados antes/depois de rename, com reutilização da obra publicada e preservação de staging antigo.
- IDs estáveis em duas instalações independentes.
- Destino de backup existente recusado, trava ativa respeitada e quota insuficiente sem registro parcial.
- Journal de outro dataset recusado, obra concluída removida não recriada e colisão de UUID recusada sem alterar o registro.

Os estados de interrupção foram montados diretamente no disco para testar recuperação deterministicamente; não se reivindica teste de queda elétrica ou kill no instante do syscall. Verificações globais, build com cópia dos derivados, CLI compilada e E2E da integração são registrados pelo coordenador. Nenhum arquivo original foi regravado e nenhum comando acessou servidor remoto.
