import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(
  new URL('../src/infrastructure/legacy-import/generated/', import.meta.url),
);
const destination = fileURLToPath(new URL('../dist/api/examples/', import.meta.url));
const names = ['manifest.json'];
for (let index = 1; index <= 34; index++) {
  const id = 'example-' + String(index).padStart(2, '0');
  names.push(id + '.program.json', id + '.png');
}
assert.deepEqual((await readdir(source)).sort(), names.toSorted(), 'Catálogo derivado inesperado.');
for (const name of names) {
  const file = await lstat(
    new URL(name, new URL('../src/infrastructure/legacy-import/generated/', import.meta.url)),
  );
  assert(
    file.isFile() && !file.isSymbolicLink() && file.size <= 2 * 1024 * 1024,
    'Derivado inválido.',
  );
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const name of names) await copyFile(source + name, destination + name);
console.log('34 exemplos preparados apenas no artefato administrativo da API.');
