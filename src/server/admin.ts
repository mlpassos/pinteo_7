import { isAbsolute } from 'node:path';
import { readServerConfig } from './config.js';
import { FileShareRepository } from './repository.js';
import { acquireStorageLock, prepareDataDirectory } from './runtime.js';

/** CLI offline restrita pelas permissões do host e pela trava exclusiva do diretório. */
async function admin(): Promise<void> {
  try {
    const [command, argument, ...extra] = process.argv.slice(2);
    if (
      !['remove', 'backup'].includes(command ?? '') ||
      !argument ||
      extra.length > 0 ||
      (command === 'backup' && !isAbsolute(argument))
    )
      throw new Error('Uso inválido.');
    const config = readServerConfig(process.env, process.cwd());
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
      'Administração indisponível. Pare a API, confira a configuração e use remove <UUID> ou backup <diretório-absoluto-novo>.',
    );
    process.exitCode = 1;
  }
}

await admin();
