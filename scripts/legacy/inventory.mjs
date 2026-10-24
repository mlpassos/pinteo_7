import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const fixtureRoot = `${root}tests/fixtures/legacy/`;

/** Calcula integridade dos bytes originais, sem decodificar ou normalizar.
 * @param {Uint8Array|string} content Conteúdo exato.
 * @returns {string} SHA-256 hexadecimal.
 */
export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

/** Inventaria os 34 conjuntos e 21 personagens atuais sem alterar arquivos originais.
 * @returns {{version:1, examples:{id:string,files:{path:string,sha256:string,bytes:number}[]}[], characters:{path:string,sha256:string,bytes:number}[], engine:{path:string,sha256:string,bytes:number}[]}} Manifesto verificável.
 */
export function inventory() {
  /** Descreve um arquivo preservando seu caminho relativo.
   * @param {string} path Caminho local inventariado.
   * @returns {{path:string,sha256:string,bytes:number}} Integridade dos bytes.
   */
  function entry(path) {
    const bytes = readFileSync(`${root}${path}`);
    return { path, sha256: sha256(bytes), bytes: bytes.length };
  }
  const examples = readdirSync(`${root}compartilhados-code`)
    .filter((name) => name.endsWith('.txt'))
    .sort()
    .map((name) => {
      const id = name.slice(0, -4);
      return {
        id,
        files: [
          `compartilhados-code/${id}.txt`,
          `compartilhados-code/${id}.cp7`,
          `compartilhados/${id}.png`,
        ].map(entry),
      };
    });
  const characters = readdirSync(`${root}images/personagens`)
    .filter((name) => name.endsWith('.png'))
    .sort()
    .map((name) => entry(`images/personagens/${name}`));
  const engine = [
    'js/logo.js',
    'js/parser.js',
    'js/turtle.js',
    'js/init.js',
    'js/pinteo7.js',
    'index.html',
  ].map(entry);
  return { version: 1, examples, characters, engine };
}

/** Preserva cópias byte a byte para auditoria e testes futuros; operação explícita de criação.
 * @returns {void} Grava fixtures e manifesto.
 */
export function preserve() {
  const manifest = inventory();
  if (manifest.examples.length !== 34 || manifest.characters.length !== 21)
    throw new Error('Inventário inesperado');
  const files = [
    ...manifest.examples.flatMap((example) => example.files),
    ...manifest.characters,
    ...manifest.engine,
  ];
  for (const file of files) {
    const destination = `${fixtureRoot}originals/${file.path}`;
    mkdirSync(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
    copyFileSync(`${root}${file.path}`, destination);
  }
  writeFileSync(`${fixtureRoot}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) preserve();
