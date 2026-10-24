import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import { createServer } from 'vite';
import sharp from 'sharp';
import { z } from 'zod';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const output = 'src/infrastructure/legacy-import/generated';
const reportPath = 'docs/evidencias/t-064/manifesto-importacao.json';
const fileSchema = z.strictObject({
  path: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nonnegative(),
});
const manifestSchema = z.object({
  version: z.literal(1),
  examples: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[A-Za-z0-9_-]+$/),
        files: z.array(fileSchema).length(3),
      }),
    )
    .length(34),
});

/** Calcula SHA-256 dos bytes sem modificar os originais.
 * @param {Uint8Array|string} content Bytes ou texto.
 * @returns {string} SHA-256 hexadecimal.
 */
function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/** Compara ou grava um destino conhecido; o modo padrão nunca regenera evidência.
 * @param {string} path Destino relativo estático ou gerado por índice.
 * @param {Uint8Array|string} content Conteúdo derivado.
 * @param {boolean} write Autoriza explicitamente a geração revisável.
 * @returns {Promise<void>} Falha se a evidência divergir no modo de conferência.
 */
async function emit(path, content, write) {
  const absolute = `${repository}${path}`;
  if (write) {
    await mkdir(absolute.slice(0, absolute.lastIndexOf('/')), { recursive: true });
    await writeFile(absolute, content);
  } else if (!(await readFile(absolute)).equals(Buffer.from(content)))
    throw new Error(`Derivado divergente: ${path}`);
}

/** Audita os 34 trios e prepara documentos/PNGs seguros, sem chamar API nem executar LOGO.
 * @returns {Promise<void>} Grava somente com --write; --check/default apenas verifica.
 */
async function main() {
  const flags = process.argv.slice(2);
  if (flags.length > 1 || (flags[0] !== undefined && !['--write', '--check'].includes(flags[0])))
    throw new Error('Use --write ou --check.');
  const write = flags[0] === '--write';
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(`${repository}tests/fixtures/legacy/manifest.json`, 'utf8')),
  );
  const server = await createServer({ root: repository, server: { middlewareMode: true } });
  try {
    // Fronteira estática de módulo próprio: Vite transpila TS, não conteúdo dos CP7.
    const importer =
      /** @type {typeof import('../../src/infrastructure/legacy-import/index.js')} */ (
        await server.ssrLoadModule('/src/infrastructure/legacy-import/index.ts')
      );
    const catalog = [];
    const report = [];
    for (const [index, example] of manifest.examples.entries()) {
      const expectedPaths = [
        `compartilhados-code/${example.id}.txt`,
        `compartilhados-code/${example.id}.cp7`,
        `compartilhados/${example.id}.png`,
      ];
      const original = [];
      for (const [fileIndex, file] of example.files.entries()) {
        if (file.path !== expectedPaths[fileIndex])
          throw new Error('Manifesto com caminho não esperado.');
        const bytes = await readFile(`${repository}tests/fixtures/legacy/originals/${file.path}`);
        const active = await readFile(`${repository}${file.path}`);
        if (bytes.length !== file.bytes || hash(bytes) !== file.sha256 || !bytes.equals(active))
          throw new Error(`Integridade original divergente: ${file.path}`);
        original.push(bytes);
      }
      const [txt, cp7, png] = original;
      if (!txt || !cp7 || !png) throw new Error('Trio incompleto.');
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const audit = importer.auditLegacyPair(decoder.decode(txt), decoder.decode(cp7));
      if (!audit.ok)
        throw new Error(
          `Importação recusada para ${example.id}: ${JSON.stringify(audit.diagnostics)}`,
        );
      const image = sharp(png, { limitInputPixels: 2048 ** 2, failOn: 'warning' });
      const metadata = await image.metadata();
      if (
        metadata.format !== 'png' ||
        metadata.width > 2048 ||
        metadata.height > 2048 ||
        png.length > 2 * 1024 * 1024
      )
        throw new Error('PNG original fora dos limites.');
      const id = `example-${String(index + 1).padStart(2, '0')}`;
      const programFile = `${id}.program.json`,
        previewFile = `${id}.png`;
      // --check valida o artefato congelado por hash/pixels, sem exigir bytes de
      // compressão idênticos entre libvips/macOS/Linux nem regenerar o baseline.
      const cleanPng = write
        ? await image.png({ compressionLevel: 9 }).toBuffer()
        : await readFile(`${repository}${output}/${previewFile}`);
      if (cleanPng.length > 2 * 1024 * 1024) throw new Error('PNG reencodado fora dos limites.');
      if (!write) {
        const checked = sharp(cleanPng, { limitInputPixels: 2048 ** 2, failOn: 'warning' });
        const checkedMetadata = await checked.metadata();
        if (
          checkedMetadata.format !== 'png' ||
          checkedMetadata.exif ||
          checkedMetadata.icc ||
          checkedMetadata.xmp ||
          checkedMetadata.iptc
        )
          throw new Error('Prévia com formato ou metadados não permitidos.');
        const [originalPixels, derivedPixels] = await Promise.all([
          image.raw().toBuffer({ resolveWithObject: true }),
          checked.raw().toBuffer({ resolveWithObject: true }),
        ]);
        if (
          JSON.stringify(originalPixels.info) !== JSON.stringify(derivedPixels.info) ||
          !originalPixels.data.equals(derivedPixels.data)
        )
          throw new Error('Pixels da prévia divergentes do original.');
      }
      const json = `${JSON.stringify(audit.value.program, null, 2)}\n`;
      await emit(`${output}/${programFile}`, json, write);
      await emit(`${output}/${previewFile}`, cleanPng, write);
      catalog.push({
        id,
        title: `Exemplo ${String(index + 1).padStart(2, '0')}`,
        programFile,
        previewFile,
      });
      report.push({
        id,
        originalId: example.id,
        originals: example.files,
        destination: {
          programFile: `${output}/${programFile}`,
          programSha256: hash(json),
          sourceSha256: hash(audit.value.program.source),
          previewFile: `${output}/${previewFile}`,
          previewSha256: hash(cleanPng),
          previewBytes: cleanPng.length,
        },
        comparison: audit.value.comparison,
        differences: audit.value.differences,
        resolution: audit.value.resolution,
        bareVariables: audit.value.cp7.bareVariables,
        orphanExpressions: audit.value.cp7.orphanExpressions,
        cp7Source: audit.value.cp7.source,
      });
    }
    await emit(
      `${output}/manifest.json`,
      `${JSON.stringify({ formatVersion: 1, examples: catalog }, null, 2)}\n`,
      write,
    );
    await emit(
      reportPath,
      `${JSON.stringify({ formatVersion: 1, canonicalSource: 'TXT original preservado', characterPolicy: 'tartaruga: os trios não persistem personagem', examples: report }, null, 2)}\n`,
      write,
    );
    console.log(
      `34 conjuntos ${write ? 'gerados' : 'conferidos'}: ${report.filter((entry) => entry.comparison === 'equivalent-ast').length} equivalentes por AST; ${report.filter((entry) => entry.comparison === 'different-ast').length} divergência explícita. CP7/HTML não publicado; fontes originais intactas.`,
    );
  } finally {
    await server.close();
  }
}

await main();
