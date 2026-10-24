import '@vitejs/plugin-react/preamble';
import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/ui/index.js';
import { createTestServices, TEST_SOURCE } from './fakes.js';

const host = document.getElementById('root');
if (!host) throw new Error('Harness sem host');
createRoot(host).render(
  createElement(
    StrictMode,
    null,
    createElement(App, {
      services: createTestServices(),
      initialDocument: { formatVersion: 1, source: TEST_SOURCE, characterId: 'tartaruga' },
      environmentLabel: 'TESTE DE INTERFACE — serviços falsos, sem executar LOGO ou publicar',
    }),
  ),
);
