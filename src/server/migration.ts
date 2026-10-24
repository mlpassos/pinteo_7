import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath, rename } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { succeed } from '../core/common/index.js';
import type { Result } from '../core/common/index.js';
import { LIMITS, programDocumentSchema } from '../shared/index.js';
import type { ProgramDocument } from '../shared/index.js';
import { isInside } from './config.js';
import { hasErrorCode, serverFailure } from './errors.js';
import { sanitizePng } from './png.js';
import { FileShareRepository } from './repository.js';
import { acquireStorageLock, prepareDataDirectory } from './runtime.js';

const journalName = '.examples-import-v1.json';
const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const catalogSchema = z.strictObject({
  formatVersion: z.literal(1),
  examples: z
    .array(
      z.strictObject({
        id: z.string().regex(/^example-[0-9]{2}$/),
        title: z.string().max(80),
        programFile: z.string(),
        previewFile: z.string(),
      }),
    )
    .length(34),
});
const journalSchema = z.strictObject({
  formatVersion: z.literal(1),
  datasetHash: hashSchema,
  createdAt: z.iso.datetime(),
  entries: z
    .array(
      z.strictObject({
        exampleId: z.string(),
        shareId: z.uuid(),
        programHash: hashSchema,
        inputPngHash: hashSchema,
        completedPngHash: hashSchema.nullable(),
      }),
    )
    .length(34),
});
type Journal = z.infer<typeof journalSchema>;
type Prepared = Readonly<{
  exampleId: string;
  shareId: string;
  program: ProgramDocument;
  programHash: string;
  inputPngHash: string;
  png: Buffer;
}>;

/** Opções administrativas; a entrada é sempre o catálogo derivado conhecido da release. */
export type MigrationOptions = Readonly<{
  dataDirectory: string;
  backupDestination: string;
  quotaBytes?: number;
}>;
/** Resultado da aplicação ou retomada, sem publicar caminhos privados. */
export type MigrationSummary = Readonly<{
  imported: number;
  reused: number;
  total: 34;
  shares: readonly Readonly<{ exampleId: string; shareId: string }>[];
}>;

/** Falha esperada de auditoria/retomada; nunca inclui conteúdo de programas. */
class MigrationFailure extends Error {
  /** Guarda somente código e mensagem pública da operação administrativa. */
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Calcula integridade exata, distinta de igualdade dos pixels PNG. */
function hash(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Reserva UUIDv8 determinístico por exemplo e namespace de migração, sem usar nome pessoal. */
function shareId(exampleId: string): string {
  const bytes = createHash('sha256').update(`pinteo7:legacy-examples:v1:${exampleId}`).digest();
  bytes[6] = ((bytes[6] ?? 0) & 15) | 128;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const text = bytes.subarray(0, 16).toString('hex');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}

/** Abre arquivo regular limitado sem seguir symlinks, antes de alocar o seu conteúdo. */
async function readBounded(path: string, maximum: number): Promise<Buffer> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > maximum)
      throw new MigrationFailure('MIGRATION_INVALID', 'Arquivo de migração inválido ou excessivo.');
    return await file.readFile();
  } finally {
    await file.close();
  }
}

/** Carrega somente os 69 nomes esperados e revalida documentos/imagens como a API. */
async function preparedExamples(): Promise<Prepared[]> {
  const source = fileURLToPath(
    new URL(
      import.meta.url.endsWith('.ts')
        ? '../infrastructure/legacy-import/generated/'
        : '../examples/',
      import.meta.url,
    ),
  );
  const parsed = catalogSchema.safeParse(
    JSON.parse(
      (await readBounded(join(source, 'manifest.json'), 16 * 1024)).toString('utf8'),
    ) as unknown,
  );
  if (!parsed.success)
    throw new MigrationFailure(
      'MIGRATION_INVALID',
      'O catálogo de exemplos da release é inválido.',
    );
  const actualFiles = await readdir(source, { withFileTypes: true });
  if (
    actualFiles.length !== 69 ||
    actualFiles.some((entry) => !entry.isFile() || entry.isSymbolicLink())
  )
    throw new MigrationFailure(
      'MIGRATION_INVALID',
      'A pasta de exemplos não corresponde à allowlist da release.',
    );
  const result: Prepared[] = [];
  for (const [index, item] of parsed.data.examples.entries()) {
    const expected = `example-${String(index + 1).padStart(2, '0')}`;
    if (
      item.id !== expected ||
      item.programFile !== `${expected}.program.json` ||
      item.previewFile !== `${expected}.png`
    )
      throw new MigrationFailure(
        'MIGRATION_INVALID',
        'O catálogo contém identidade ou caminho não permitido.',
      );
    const program = programDocumentSchema.safeParse(
      JSON.parse(
        (await readBounded(join(source, item.programFile), 6 * LIMITS.sourceBytes + 4096)).toString(
          'utf8',
        ),
      ) as unknown,
    );
    if (!program.success)
      throw new MigrationFailure(
        'MIGRATION_INVALID',
        'Um documento de exemplo não atende ao contrato.',
      );
    const input = await readBounded(join(source, item.previewFile), LIMITS.pngBytes);
    const png = await sanitizePng(input.toString('base64'));
    if (!png.ok)
      throw new MigrationFailure(
        'MIGRATION_INVALID',
        'Uma imagem de exemplo não atende ao contrato PNG.',
      );
    result.push({
      exampleId: item.id,
      shareId: shareId(item.id),
      program: program.data,
      programHash: hash(JSON.stringify(program.data)),
      inputPngHash: hash(input),
      png: png.value,
    });
  }
  return result;
}

/** Inventaria arquivos privados por hash incremental; nunca segue links simbólicos. */
async function snapshot(
  directory: string,
  prefix = '',
): Promise<Readonly<{ path: string; bytes: number; hash: string }>[]> {
  const entries: { path: string; bytes: number; hash: string }[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!prefix && entry.name === '.instance-lock') continue;
    const path = join(directory, entry.name),
      relative = prefix + entry.name;
    if (entry.isSymbolicLink())
      throw new MigrationFailure(
        'MIGRATION_INVALID',
        'O armazenamento contém link simbólico; revise-o antes da migração.',
      );
    if (entry.isDirectory()) entries.push(...(await snapshot(path, relative + '/')));
    else {
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const info = await file.stat();
        if (!info.isFile())
          throw new MigrationFailure(
            'MIGRATION_INVALID',
            'O armazenamento contém entrada não regular.',
          );
        const digest = createHash('sha256'),
          chunk = Buffer.alloc(64 * 1024);
        for (;;) {
          const read = await file.read(chunk, 0, chunk.length, null);
          if (!read.bytesRead) break;
          digest.update(chunk.subarray(0, read.bytesRead));
        }
        entries.push({ path: relative, bytes: info.size, hash: digest.digest('hex') });
      } finally {
        await file.close();
      }
    }
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

/** Soma a ocupação antes de criar um temporário de journal, incluindo resíduos e trava. */
async function diskBytes(directory: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new MigrationFailure('MIGRATION_INVALID', 'Link simbólico não permitido nos dados.');
    const path = join(directory, entry.name);
    total += entry.isDirectory() ? await diskBytes(path) : (await lstat(path)).size;
  }
  return total;
}

/** Grava journal por rename atômico; temporários de queda são preservados e contam na quota. */
async function saveJournal(directory: string, journal: Journal, quota: number): Promise<void> {
  const bytes = Buffer.from(JSON.stringify(journal, null, 2) + '\n');
  if ((await diskBytes(directory)) + bytes.length > quota)
    throw new MigrationFailure(
      'QUOTA_EXCEEDED',
      'Não há quota para reservar o manifesto da migração.',
    );
  const temporary = join(directory, `${journalName}.${randomUUID()}.tmp`);
  const file = await open(temporary, 'wx', 0o600);
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, join(directory, journalName));
}

/** Recusa drift de release/manifesto; um registro concluído nunca é reinterpretado ou atualizado. */
function checkJournal(journal: Journal, prepared: readonly Prepared[], datasetHash: string): void {
  if (
    journal.datasetHash !== datasetHash ||
    journal.entries.some((entry, index) => {
      const item = prepared[index];
      return (
        !item ||
        entry.exampleId !== item.exampleId ||
        entry.shareId !== item.shareId ||
        entry.programHash !== item.programHash ||
        entry.inputPngHash !== item.inputPngHash
      );
    })
  )
    throw new MigrationFailure(
      'MIGRATION_CONFLICT',
      'O manifesto não corresponde aos exemplos desta release. Nenhuma obra será sobrescrita.',
    );
}

/** Confere pixels ao recuperar rename já concluído, sem exigir compressão idêntica entre hosts. */
async function samePixels(left: Buffer, right: Buffer): Promise<boolean> {
  const [a, b] = await Promise.all([
    sharp(left, { limitInputPixels: 2048 ** 2, failOn: 'warning' })
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(right, { limitInputPixels: 2048 ** 2, failOn: 'warning' })
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  return JSON.stringify(a.info) === JSON.stringify(b.info) && a.data.equals(b.data);
}

/**
 * Migra os 34 derivados sob trava offline, com backup verificado antes de qualquer
 * alteração de journal/share. Uma retomada reconcilia publicação por UUID reservado.
 */
export async function importPreparedExamples(
  options: MigrationOptions,
): Promise<Result<MigrationSummary>> {
  let unlock: (() => Promise<void>) | undefined;
  try {
    if (!isAbsolute(options.dataDirectory) || !isAbsolute(options.backupDestination))
      throw new MigrationFailure(
        'MIGRATION_INVALID',
        'Dados e destino de backup devem ser absolutos.',
      );
    const prepared = await preparedExamples();
    const quota = options.quotaBytes ?? 250 * 1024 * 1024;
    if (!Number.isSafeInteger(quota) || quota < 1)
      throw new MigrationFailure('MIGRATION_INVALID', 'A quota de migração é inválida.');
    await prepareDataDirectory(options.dataDirectory, process.cwd());
    const [dataDirectory, checkout, backupParent] = await Promise.all([
      realpath(options.dataDirectory),
      realpath(process.cwd()),
      realpath(dirname(options.backupDestination)),
    ]);
    const backup = join(backupParent, basename(options.backupDestination));
    if (
      isInside(checkout, backup) ||
      isInside(dataDirectory, backup) ||
      isInside(backup, dataDirectory)
    )
      throw new MigrationFailure(
        'MIGRATION_INVALID',
        'O backup deve ficar fora dos dados e da release pública.',
      );
    unlock = await acquireStorageLock(dataDirectory);
    const repository = new FileShareRepository(dataDirectory, quota);
    const initialized = await repository.initialize();
    if (!initialized.ok) return initialized;
    const datasetHash = hash(
      JSON.stringify(prepared.map((item) => [item.exampleId, item.programHash, item.inputPngHash])),
    );
    let journal: Journal;
    try {
      const read = journalSchema.safeParse(
        JSON.parse(
          (await readBounded(join(dataDirectory, journalName), 64 * 1024)).toString('utf8'),
        ) as unknown,
      );
      if (!read.success)
        throw new MigrationFailure(
          'MIGRATION_CONFLICT',
          'O manifesto existente é inválido. Preserve os dados e revise o backup.',
        );
      journal = read.data;
      checkJournal(journal, prepared, datasetHash);
    } catch (error) {
      if (!hasErrorCode(error, 'ENOENT')) throw error;
      journal = {
        formatVersion: 1,
        datasetHash,
        createdAt: new Date().toISOString(),
        entries: prepared.map((item) => ({
          exampleId: item.exampleId,
          shareId: item.shareId,
          programHash: item.programHash,
          inputPngHash: item.inputPngHash,
          completedPngHash: null,
        })),
      };
    }
    const before = await snapshot(dataDirectory);
    const backed = await repository.backup(backup);
    if (!backed.ok) return backed;
    if (JSON.stringify(before) !== JSON.stringify(await snapshot(backup)))
      throw new MigrationFailure(
        'MIGRATION_BACKUP_FAILED',
        'O backup não corresponde aos dados. Migração interrompida antes de alterar obras.',
      );
    await saveJournal(dataDirectory, journal, quota);
    let imported = 0,
      reused = 0;
    for (const [index, item] of prepared.entries()) {
      const reserved = journal.entries[index];
      if (!reserved)
        throw new MigrationFailure('MIGRATION_CONFLICT', 'Reserva de exemplo ausente.');
      const existing = await repository.load(item.shareId);
      if (existing.ok) {
        if (
          existing.value.createdAt !== journal.createdAt ||
          hash(JSON.stringify(existing.value.program)) !== item.programHash
        )
          throw new MigrationFailure(
            'MIGRATION_CONFLICT',
            'Uma identidade reservada contém outra obra. Nada será sobrescrito.',
          );
        const image = await repository.preview(item.shareId);
        if (!image.ok) return image;
        if (
          reserved.completedPngHash
            ? hash(image.value) !== reserved.completedPngHash
            : !(await samePixels(image.value, item.png))
        )
          throw new MigrationFailure(
            'MIGRATION_CONFLICT',
            'A prévia existente diverge da reserva de migração.',
          );
        if (reserved.completedPngHash === null) {
          reserved.completedPngHash = hash(image.value);
          await saveJournal(dataDirectory, journal, quota);
        }
        reused++;
      } else {
        if (existing.diagnostics[0]?.code !== 'NOT_FOUND' || reserved.completedPngHash !== null)
          throw new MigrationFailure(
            'MIGRATION_CONFLICT',
            'Uma obra reservada está ausente ou incompleta. Preserve os dados para revisão.',
          );
        const created = await repository.createImported(item.program, item.png, {
          id: item.shareId,
          createdAt: journal.createdAt,
        });
        if (!created.ok) return created;
        reserved.completedPngHash = hash(item.png);
        await saveJournal(dataDirectory, journal, quota);
        imported++;
      }
    }
    return succeed({
      imported,
      reused,
      total: 34,
      shares: prepared.map((item) => ({ exampleId: item.exampleId, shareId: item.shareId })),
    });
  } catch (error) {
    if (error instanceof MigrationFailure) return serverFailure(error.code, error.message);
    return serverFailure(
      'STORAGE_UNAVAILABLE',
      'Não foi possível concluir a migração offline. Preserve os dados e o backup para retomar.',
    );
  } finally {
    await unlock?.();
  }
}
