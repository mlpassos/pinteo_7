import { isAbsolute } from 'node:path';
import { readServerConfig } from './config.js';
import { FileShareRepository } from './repository.js';
import { acquireStorageLock, prepareDataDirectory } from './runtime.js';
import { importPreparedExamples } from './migration.js';

/** CLI offline restrita pelas permissões do host e pela trava exclusiva do diretório. */
async function admin(): Promise<void> {
  try {
    const [command, argument, ...extra] = process.argv.slice(2);
    if (
      !['remove', 'backup', 'import-examples'].includes(command ?? '') ||
      !argument ||
      extra.length > 0 ||
      (command !== 'remove' && !isAbsolute(argument))
    )
      throw new Error('Uso inválido.');
    const config = readServerConfig(process.env, process.cwd());
    if (command === 'import-examples') {
      const migrated = await importPreparedExamples({
        dataDirectory: config.dataDirectory,
        backupDestination: argument,
        quotaBytes: config.quotaBytes,
      });
      if (migrated.ok)
        console.info(
          `Migração: ${String(migrated.value.imported)} importados, ${String(migrated.value.reused)} já presentes, 34 conferidos.`,
        );
      else {
        console.error(migrated.diagnostics[0]?.message ?? 'Migração indisponível.');
        process.exitCode = 1;
      }
      return;
    }
    await prepareDataDirectory(config.dataDirectory, process.cwd());
    const unlock = await acquireStorageLock(config.dataDirectory);
    try {
      const repository = new FileShareRepository(config.dataDirectory, config.quotaBytes);
      const result =
        command === 'remove'
          ? await repository.remove(argument)
          : await repository.backup(argument);
      if (result.ok) console.info('Operação administrativa concluída.');
      else {
        console.error(result.diagnostics[0]?.message ?? 'Operação indisponível.');
        process.exitCode = 1;
      }
    } finally {
      await unlock();
    }
  } catch {
    console.error(
      'Administração indisponível. Pare a API, confira a configuração e use remove <UUID>, backup <diretório-absoluto-novo> ou import-examples <backup-absoluto-novo>.',
    );
    process.exitCode = 1;
  }
}

await admin();
