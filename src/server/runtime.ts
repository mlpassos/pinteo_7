import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { mkdir, open, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getRequestListener } from '@hono/node-server';
import { createApi } from './http.js';
import { isInside } from './config.js';
import type { ServerConfig } from './config.js';
import { FileShareRepository } from './repository.js';

/** Trava local exclusiva; restauração após queda exige verificar o PID antes de remover. */
export async function acquireStorageLock(directory: string): Promise<() => Promise<void>> {
  const path = join(directory, '.instance-lock');
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(`${String(process.pid)}\n`);
    await file.sync();
  } catch (error) {
    await file.close();
    await rm(path, { force: true });
    throw error;
  }
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await file.close();
    await rm(path);
  };
}

/** Verifica caminhos físicos para impedir dados no checkout por um ancestral simbólico. */
export async function prepareDataDirectory(directory: string, checkout: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const [realDirectory, realCheckout] = await Promise.all([
    realpath(directory),
    realpath(checkout),
  ]);
  if (isInside(realCheckout, realDirectory))
    throw new Error('Os dados devem ficar fora do checkout público.');
}

/** Instância loopback, sem arquivos estáticos; close aguarda conexões e libera a trava. */
export type RunningApi = Readonly<{ server: Server; close: () => Promise<void> }>;

/** Inicializa armazenamento e socket; a porta zero é útil apenas para testes locais. */
export async function startApiServer(config: ServerConfig, checkout: string): Promise<RunningApi> {
  await prepareDataDirectory(config.dataDirectory, checkout);
  const repository = new FileShareRepository(config.dataDirectory, config.quotaBytes);
  const initialized = await repository.initialize();
  if (!initialized.ok) throw new Error('Não foi possível inicializar o armazenamento.');
  const unlock = await acquireStorageLock(config.dataDirectory);
  try {
    const app = createApi({
      repository,
      publicOrigin: config.publicOrigin,
      trustLocalProxy: config.trustLocalProxy,
    });
    const listener = getRequestListener(
      (request, bindings) =>
        app.fetch(request, { peerAddress: bindings.incoming.socket.remoteAddress ?? '' }),
      {
        overrideGlobalObjects: false,
        errorHandler: () =>
          new Response(
            JSON.stringify({
              error: { code: 'UNEXPECTED', message: 'Não foi possível concluir a solicitação.' },
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'no-store',
              },
            },
          ),
      },
    );
    const server = createServer(
      {
        requestTimeout: 15_000,
        headersTimeout: 10_000,
        maxHeaderSize: 16 * 1024,
        connectionsCheckingInterval: 1000,
      },
      (request, response) => {
        void listener(request, response);
      },
    );
    server.maxConnections = 128;
    server.keepAliveTimeout = 5000;
    await new Promise<void>((resolveListening, reject) => {
      server.once('error', reject);
      server.listen(config.port, '127.0.0.1', () => {
        server.off('error', reject);
        resolveListening();
      });
    });
    let closed = false;
    return {
      server,
      close: async () => {
        if (closed) return;
        closed = true;
        await new Promise<void>((resolveClosed, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolveClosed();
          });
        });
        await unlock();
      },
    };
  } catch (error) {
    await unlock();
    throw error;
  }
}
