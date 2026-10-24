import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './index.js';

const host = document.getElementById('root');
if (!host) throw new Error('Não foi encontrado o ponto de montagem da interface.');
createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
