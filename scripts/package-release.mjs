import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Executa comandos próprios por argumentos, sem shell ou interpolação de conteúdo.
 * @param {string} command Executável local já instalado.
 * @param {string[]} args Argumentos explícitos.
 * @returns {string} Saída UTF-8.
 */
function command(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

/** Calcula SHA-256 de conteúdo exato.
 * @param {Uint8Array} content Bytes do arquivo.
 * @returns {string} Hash hexadecimal.
 */
function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/** Percorre somente arquivos regulares, recusando symlink e entradas especiais.
 * @param {string} directory Diretório conhecido da allowlist.
 * @returns {Promise<string[]>} Caminhos relativos à raiz do projeto.
 */
async function walk(directory) {
  const info = await lstat(resolve(root, directory));
  assert(info.isDirectory() && !info.isSymbolicLink(), `Diretório inválido: ${directory}`);
  const result = [];
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    assert(!entry.isSymbolicLink(), `Link fora da allowlist: ${path}`);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else {
      assert(entry.isFile(), `Entrada especial fora da allowlist: ${path}`);
      result.push(path);
    }
  }
  return result.sort();
}

/** Escreve texto UTF-8 numa região fixa do cabeçalho USTAR.
 * @param {Buffer} header Cabeçalho de 512 bytes.
 * @param {number} start Offset inicial.
 * @param {number} length Tamanho máximo.
 * @param {string} value Texto representável.
 * @returns {void} Modifica o cabeçalho local.
 */
function textField(header, start, length, value) {
  assert(Buffer.byteLength(value) <= length, 'Campo USTAR excessivo.');
  header.write(value, start, length, 'utf8');
}

/** Escreve um campo octal canônico terminado em NUL.
 * @param {Buffer} header Cabeçalho local.
 * @param {number} start Offset inicial.
 * @param {number} length Tamanho reservado.
 * @param {number} value Inteiro não negativo.
 * @returns {void} Modifica o cabeçalho.
 */
function octalField(header, start, length, value) {
  const number = value.toString(8);
  assert(
    number.length < length && Number.isSafeInteger(value) && value >= 0,
    'Número USTAR fora do limite.',
  );
  textField(header, start, length, number.padStart(length - 1, '0') + '\0');
}

/** Gera uma entrada USTAR determinística sem preservar UID/GID/data da máquina.
 * @param {string} path Nome seguro no arquivo.
 * @param {Buffer} content Bytes do arquivo regular.
 * @param {number} epoch Timestamp do commit Git.
 * @returns {Buffer[]} Cabeçalho, conteúdo e padding.
 */
function tarEntry(path, content, epoch) {
  assert(
    !path.startsWith('/') && !path.split('/').includes('..') && !/[\r\n\0]/.test(path),
    'Caminho inseguro no pacote.',
  );
  const header = Buffer.alloc(512);
  let name = path,
    prefix = '';
  if (Buffer.byteLength(name) > 100) {
    const positions = [...path.matchAll(/\//g)].map((match) => match.index);
    const split = positions.findLast(
      (offset) =>
        Buffer.byteLength(path.slice(0, offset)) <= 155 &&
        Buffer.byteLength(path.slice(offset + 1)) <= 100,
    );
    assert(split !== undefined, 'Caminho excede USTAR.');
    prefix = path.slice(0, split);
    name = path.slice(split + 1);
  }
  textField(header, 0, 100, name);
  octalField(header, 100, 8, 0o644);
  octalField(header, 108, 8, 0);
  octalField(header, 116, 8, 0);
  octalField(header, 124, 12, content.length);
  octalField(header, 136, 12, epoch);
  header.fill(32, 148, 156);
  header[156] = 48;
  textField(header, 257, 6, 'ustar\0');
  textField(header, 263, 2, '00');
  textField(header, 345, 155, prefix);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  textField(header, 148, 8, checksum.toString(8).padStart(6, '0') + '\0 ');
  return [header, content, Buffer.alloc((512 - (content.length % 512)) % 512)];
}

/** Empacota somente o build verificado e avisos operacionais/licenças aprovados.
 * @returns {Promise<void>} Escreve pacote e hashes fora do webroot, sem publicar.
 */
async function main() {
  const args = process.argv.slice(2);
  assert(
    args.length === 0 || (args.length === 1 && args[0] === '--allow-dirty'),
    'Use somente --allow-dirty para revisão local.',
  );
  const initialStatus = command('git', ['status', '--porcelain', '--untracked-files=all']);
  const dirty = initialStatus.trim().length > 0;
  assert(
    !dirty || args[0] === '--allow-dirty',
    'Release final exige árvore Git limpa. Faça o commit revisado antes de empacotar.',
  );
  const gitSha = command('git', ['rev-parse', 'HEAD']).trim();
  const epoch = Number(command('git', ['show', '-s', '--format=%ct', 'HEAD']).trim());
  const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
  const version = packageJson.version;
  assert(
    typeof version === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(version),
    'Versão SemVer de release inválida.',
  );
  assert(
    lock.version === version && lock.packages?.['']?.version === version,
    'Versões package/lock divergentes.',
  );
  const name = `pinteo7-v${version}-${gitSha.slice(0, 12)}${dirty ? '-working-tree' : ''}`;

  console.log('Compilando o SHA informado antes do empacotamento.');
  process.stdout.write(command('npm', ['run', 'build']));
  process.stdout.write(command(process.execPath, ['scripts/check-artifact.mjs']));
  assert(
    command('git', ['rev-parse', 'HEAD']).trim() === gitSha,
    'O HEAD mudou durante a geração.',
  );

  const api = await walk('dist/api');
  const expectedApi = [
    'dist/api/core/common/index.js',
    ...[
      'admin',
      'config',
      'errors',
      'http',
      'index',
      'main',
      'migration',
      'png',
      'repository',
      'runtime',
      'service',
    ].map((file) => `dist/api/server/${file}.js`),
    'dist/api/shared/characters.js',
    'dist/api/shared/index.js',
    'dist/api/examples/manifest.json',
    ...Array.from(
      { length: 34 },
      (_, index) => `example-${String(index + 1).padStart(2, '0')}`,
    ).flatMap((id) => [`dist/api/examples/${id}.program.json`, `dist/api/examples/${id}.png`]),
  ].sort();
  assert.deepEqual(api, expectedApi, 'O artefato API saiu da allowlist exata.');
  const payload = [
    ...(await walk('dist/web')),
    ...api,
    'package.json',
    'package-lock.json',
    '.npmrc',
    'LICENSE',
    'Papert-License.txt',
    'docs/LICENCAS.md',
    'docs/DEPLOY.md',
    ...(await walk('licenses')),
    ...(await walk('deploy')),
  ].sort();
  assert(new Set(payload).size === payload.length, 'Caminhos duplicados na allowlist.');
  const entries = [];
  for (const path of payload) {
    assert(
      !/(?:^|\/)(?:node_modules|tests|compartilhados|compartilhados-code)(?:\/|$)|\.(?:php|cp7|old|new)$/i.test(
        path,
      ),
      `Arquivo proibido no pacote: ${path}`,
    );
    const info = await lstat(resolve(root, path));
    assert(info.isFile() && !info.isSymbolicLink(), `Arquivo regular obrigatório: ${path}`);
    entries.push({ path, content: await readFile(resolve(root, path)) });
  }
  const metadata = {
    formatVersion: 1,
    version,
    gitSha,
    dirty,
    sourceDateEpoch: epoch,
    files: entries.map((entry) => ({
      path: entry.path,
      bytes: entry.content.length,
      sha256: hash(entry.content),
    })),
  };
  entries.push({
    path: 'release-manifest.json',
    content: Buffer.from(JSON.stringify(metadata, null, 2) + '\n'),
  });
  const checksums = entries
    .map((entry) => `${hash(entry.content)}  ${entry.path}\n`)
    .sort()
    .join('');
  entries.push({ path: 'SHA256SUMS', content: Buffer.from(checksums) });
  entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  assert(
    command('git', ['status', '--porcelain', '--untracked-files=all']) === initialStatus,
    'A árvore mudou durante a geração; revise e repita.',
  );
  const directory = resolve(root, 'artifacts', name);
  try {
    const previous = await walk(relative(root, directory));
    assert.deepEqual(
      previous.map((path) => relative(directory, resolve(root, path))).sort(),
      entries.map((entry) => entry.path).sort(),
      'Diretório de saída contém arquivos extras; preserve-o e use um novo commit revisado.',
    );
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  await mkdir(directory, { recursive: true });
  for (const entry of entries) {
    const destination = resolve(directory, entry.path);
    assert(
      relative(directory, destination) !== '..' &&
        !relative(directory, destination).startsWith('../'),
      'Destino inseguro.',
    );
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, entry.content, { mode: 0o644 });
  }
  const tar = Buffer.concat([
    ...entries.flatMap((entry) => tarEntry(`${name}/${entry.path}`, entry.content, epoch)),
    Buffer.alloc(1024),
  ]);
  const archive = gzipSync(tar, { level: 9 });
  const archivePath = resolve(root, 'artifacts', `${name}.tar.gz`);
  await writeFile(archivePath, archive);
  await writeFile(`${archivePath}.sha256`, `${hash(archive)}  ${basename(archivePath)}\n`);
  console.log(
    JSON.stringify(
      {
        version,
        gitSha,
        dirty,
        payloadFiles: payload.length,
        archive: relative(root, archivePath),
        sha256: hash(archive),
        bytes: archive.length,
      },
      null,
      2,
    ),
  );
  if (dirty)
    console.log('Somente revisão local: working-tree/dirty não é um pacote final de produção.');
}

await main();
