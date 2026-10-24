import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { runLegacy } from './harness.mjs';
import { fixtureRoot, inventory, root, sha256 } from './inventory.mjs';

/** Executa todos os TXT originais e registra desenho, saída, erros e estado observados.
 * @returns {unknown[]} Capturas completas dos 34 exemplos.
 */
export function characterize() {
  return inventory().examples.map((example) => {
    const source = readFileSync(`${root}compartilhados-code/${example.id}.txt`, 'utf8');
    const result = runLegacy([{ kind: 'run', source }], 5000);
    return { id: example.id, sourceSha256: sha256(source), result };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = characterize();
  writeFileSync(`${fixtureRoot}examples.json.gz`, gzipSync(`${JSON.stringify(results)}\n`));
  console.log(`Caracterizados ${results.length} exemplos no Papert original.`);
}
