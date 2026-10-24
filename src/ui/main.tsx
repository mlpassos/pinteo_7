import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { App } from './index.js';
import type { UiServices } from './index.js';
import { LogoRunner } from '../application/runner/index.js';
import { sourceToBlocks, editBlocks, blocksToSource } from '../core/program/index.js';
import { createRenderer } from '../infrastructure/canvas/index.js';
import { createHttpShareStore } from '../infrastructure/http/index.js';
import { fail } from '../core/common/index.js';

const host = document.getElementById('root');
if (!host) throw new Error('Não foi encontrado o ponto de montagem da interface.');
const runner = new LogoRunner();
const services: UiServices = {
  runner,
  conversion: { sourceToBlocks, editBlocks, blocksToSource },
  shares: createHttpShareStore(),
  createRenderer,
};
const requested = new URLSearchParams(window.location.search).getAll('share');
const parsed = z.uuid().safeParse(requested[0]);
// A promessa é criada uma vez pela composição, fora dos efeitos repetidos do StrictMode.
const initialShare =
  requested.length === 0
    ? undefined
    : parsed.success && requested.length === 1
      ? { id: parsed.data.toLowerCase(), response: services.shares.load(parsed.data.toLowerCase()) }
      : {
          id: '',
          response: Promise.resolve(
            fail({
              code: 'INVALID_SHARE_ID',
              message: 'O link de compartilhamento é inválido. Seu rascunho foi preservado.',
            }),
          ),
        };
const root = createRoot(host);
root.render(
  <StrictMode>
    <App services={services} initialMode="visual" {...(initialShare ? { initialShare } : {})} />
  </StrictMode>,
);
let disposed = false;
/** A composição é dona do runner; desmontagem React libera assinaturas e renderers. */
function dispose() {
  if (disposed) return;
  disposed = true;
  root.unmount();
  runner.dispose();
  window.removeEventListener('pagehide', pageHidden);
}
/** BFCache conserva o documento React, mas nunca deixa execução rodando em segundo plano. */
function pageHidden(event: PageTransitionEvent) {
  if (event.persisted) runner.stop();
  else dispose();
}
window.addEventListener('pagehide', pageHidden);
import.meta.hot?.dispose(dispose);
