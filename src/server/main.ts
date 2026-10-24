import { readServerConfig } from './config.js';
import { startApiServer } from './runtime.js';

/** Entrada do processo; configuração/falha são reportadas sem conteúdo ou caminhos privados. */
async function main(): Promise<void> {
  try {
    const config = readServerConfig(process.env, process.cwd());
    const api = await startApiServer(config, process.cwd());
    console.info(`API Pinte o 7 em http://127.0.0.1:${String(config.port)}`);
    /** Encerra ordenadamente as conexões e libera a trava de instância. */
    async function shutdown(): Promise<void> {
      await api.close();
    }
    process.once('SIGTERM', () => {
      void shutdown();
    });
    process.once('SIGINT', () => {
      void shutdown();
    });
  } catch {
    console.error(
      'Não foi possível iniciar a API. Verifique configuração, permissões e trava de instância.',
    );
    process.exitCode = 1;
  }
}

await main();
