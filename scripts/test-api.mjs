import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startApiServer, importPreparedExamples } from '../dist/api/server/index.js';

const temporary = await mkdtemp(join(tmpdir(), 'pinteo7-e2e-'));
let api;
let closing = false;
/** Encerra somente a API e o diretório temporário criados por este harness. */
async function close() {
  if (closing) return;
  closing = true;
  await api?.close();
  await rm(temporary, { recursive: true, force: true });
}
try {
  const dataDirectory = join(temporary, 'data');
  const migrated = await importPreparedExamples({
    dataDirectory,
    backupDestination: join(temporary, 'backup-inicial'),
  });
  if (!migrated.ok) throw new Error('Não foi possível preparar os exemplos de teste.');
  api = await startApiServer(
    {
      dataDirectory,
      publicOrigin: 'http://127.0.0.1:5180',
      port: 5178,
      quotaBytes: 250 * 1024 * 1024,
      trustLocalProxy: false,
    },
    process.cwd(),
  );
  console.log('API real de teste em 5178 com 34 exemplos, dados temporários fora do checkout.');
  process.once('SIGINT', () => {
    void close();
  });
  process.once('SIGTERM', () => {
    void close();
  });
} catch (error) {
  await close();
  throw error;
}
