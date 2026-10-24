import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import assert from 'node:assert/strict';

/**
 * Percorre o artefato, sem acessar o repositório como diretório publicável.
 * @param {string} directory Diretório a conferir.
 * @returns {Promise<string[]>} Caminhos absolutos dos arquivos encontrados.
 */
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

const root = resolve('dist/web');
for (const path of await listFiles(root)) {
  const local = relative(root, path);
  assert(
    local === 'index.html' || /^assets\/[\w.-]+\.(?:js|css)$/.test(local),
    `Arquivo fora da allowlist da fundação: ${local}`,
  );
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert(!html.includes('../src/'), 'O artefato não pode apontar para o código fonte.');
console.log('Artefato da fundação: apenas HTML e bundles previstos, sem PHP/CP7/legado.');
