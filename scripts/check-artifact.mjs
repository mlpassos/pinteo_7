import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { CHARACTER_IDS } from '../src/shared/characters.ts';

/**
 * Percorre apenas o artefato publicável.
 * @param {string} directory Diretório a conferir.
 * @returns {Promise<string[]>} Arquivos absolutos encontrados.
 */
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      assert(!entry.isSymbolicLink(), 'Links não são permitidos no artefato.');
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

/**
 * Calcula identidade do conteúdo; o nome hash do bundler sozinho não autoriza assets.
 * @param {string} path Arquivo local.
 * @returns {Promise<string>} SHA256.
 */
async function digest(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

const sources = [
  ...CHARACTER_IDS.map((id) => `images/personagens/${id}.png`),
  'sounds/click.mp3',
  'sounds/delete.mp3',
  'videos/blockprog.mp4',
  'legendas/pt-br.vtt',
  'src/infrastructure/assets/wood-grain.svg',
  'src/infrastructure/assets/material-noise.svg',
  ...[400, 600, 700, 800].flatMap((weight) =>
    ['woff', 'woff2'].map(
      (extension) =>
        `node_modules/@fontsource/nunito/files/nunito-latin-${String(weight)}-normal.${extension}`,
    ),
  ),
];
const knownAssets = new Set(await Promise.all(sources.map(digest)));
const root = resolve('dist/web');
for (const path of await listFiles(root)) {
  const local = relative(root, path);
  if (local === 'index.html' || /^assets\/[\w.-]+-[\w-]{6,}\.(?:js|css)$/.test(local)) continue;
  assert(
    /^assets\/[\w.-]+-[\w-]{6,}\.(?:png|svg|mp3|mp4|vtt|woff2?)$/.test(local),
    `Arquivo fora da allowlist: ${local}`,
  );
  assert(knownAssets.has(await digest(path)), `Asset não corresponde à fonte autorizada: ${local}`);
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert(!html.includes('../src/'), 'O artefato não pode apontar para o código fonte.');
console.log(
  'Artefato web: HTML/bundles e assets locais autorizados por SHA256; sem PHP/CP7/legado.',
);
