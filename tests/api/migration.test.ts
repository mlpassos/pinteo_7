import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FileShareRepository, importPreparedExamples } from '../../src/server/index.js';
import { acquireStorageLock } from '../../src/server/runtime.js';
import { programDocumentSchema } from '../../src/shared/index.js';

const journalName = '.examples-import-v1.json';
const journalSchema = z.object({
  formatVersion: z.literal(1),
  datasetHash: z.string(),
  createdAt: z.string(),
  entries: z
    .array(
      z.object({
        exampleId: z.string(),
        shareId: z.string(),
        programHash: z.string(),
        inputPngHash: z.string(),
        completedPngHash: z.string().nullable(),
      }),
    )
    .length(34),
});
let root: string;
let data: string;

/** Exige resultado migrado para não ocultar falhas na preparação dos cenários. */
async function migrate(backupName: string = randomUUID()) {
  const result = await importPreparedExamples({
    dataDirectory: data,
    backupDestination: join(root, backupName),
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}

/** Lê o manifesto privado somente para simular pontos de interrupção entre publicações. */
async function journal() {
  return journalSchema.parse(
    JSON.parse(await readFile(join(data, journalName), 'utf8')) as unknown,
  );
}

/** Calcula hash dos bytes já persistidos sem reinterpretar o documento. */
function hash(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pinteo7-migration-'));
  data = join(root, 'data');
  await mkdir(data, { mode: 0o700 });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('migração offline idempotente dos 34 conjuntos', () => {
  it('preserva obra existente, faz backup antes da mutação e reabre os 34 no repositório real', async () => {
    const repository = new FileShareRepository(data);
    const fixturePng = await readFile('src/infrastructure/legacy-import/generated/example-01.png');
    const existing = await repository.create(
      { formatVersion: 1, characterId: 'arara', source: '; obra independente\nforward 5' },
      fixturePng,
    );
    if (!existing.ok) throw new Error('Obra inicial não persistiu.');
    const saved = await readFile(join(data, existing.value.id, 'program.json'));
    const first = await migrate('backup-first');
    expect(first).toMatchObject({ imported: 34, reused: 0, total: 34 });
    expect(new Set(first.shares.map((entry) => entry.shareId)).size).toBe(34);
    expect(
      (await readFile(join(root, 'backup-first', existing.value.id, 'program.json'))).equals(saved),
    ).toBe(true);
    expect(await readdir(join(root, 'backup-first'))).toEqual([existing.value.id]);
    expect((await readFile(join(data, existing.value.id, 'program.json'))).equals(saved)).toBe(
      true,
    );
    const storedJournal = await journal();
    expect(storedJournal.entries.every((entry) => entry.completedPngHash !== null)).toBe(true);
    for (const item of first.shares) {
      const expected = programDocumentSchema.parse(
        JSON.parse(
          await readFile(
            `src/infrastructure/legacy-import/generated/${item.exampleId}.program.json`,
            'utf8',
          ),
        ) as unknown,
      );
      const loaded = await repository.load(item.shareId);
      expect(loaded.ok).toBe(true);
      if (loaded.ok) expect(loaded.value.program).toEqual(expected);
      expect((await repository.preview(item.shareId)).ok).toBe(true);
    }
    const second = await migrate('backup-repeat');
    expect(second).toEqual({ ...first, imported: 0, reused: 34 });
    expect((await repository.list(undefined, 50)).ok).toBe(true);
    expect((await readdir(data)).filter((entry) => /^[0-9a-f-]{36}$/.test(entry))).toHaveLength(35);
    expect(await readdir(data)).not.toContain('.instance-lock');
  });

  it('retoma após rename antes de confirmar status, sem duplicar UUIDs nem sobrescrever o publicado', async () => {
    const original = await migrate('backup-initial');
    const pending = await journal();
    for (const entry of pending.entries) entry.completedPngHash = null;
    await writeFile(join(data, journalName), JSON.stringify(pending));
    const repository = new FileShareRepository(data);
    const first = original.shares[0];
    if (!first) throw new Error('Exemplo ausente.');
    const published = await readFile(join(data, first.shareId, 'program.json'));
    for (const item of original.shares.slice(1))
      expect((await repository.remove(item.shareId)).ok).toBe(true);
    const resumed = await migrate('backup-resume');
    expect(resumed).toMatchObject({ imported: 33, reused: 1, shares: original.shares });
    expect((await readFile(join(data, first.shareId, 'program.json'))).equals(published)).toBe(
      true,
    );
    expect((await readdir(data)).filter((entry) => /^[0-9a-f-]{36}$/.test(entry))).toHaveLength(34);
  });

  it('retoma antes do rename sem apagar staging residual de outra execução', async () => {
    const original = await migrate();
    const pending = await journal(),
      first = pending.entries[0];
    if (!first) throw new Error('Exemplo ausente.');
    first.completedPngHash = null;
    await writeFile(join(data, journalName), JSON.stringify(pending));
    expect((await new FileShareRepository(data).remove(first.shareId)).ok).toBe(true);
    const staging = `.staging-${first.shareId}-interrompido`;
    await mkdir(join(data, staging));
    await writeFile(join(data, staging, 'program.json'), '{incompleto');
    expect(await migrate()).toMatchObject({ imported: 1, reused: 33, shares: original.shares });
    expect(await readFile(join(data, staging, 'program.json'), 'utf8')).toBe('{incompleto');
  });

  it('reserva IDs estáveis em duas instalações vazias, independentemente do timestamp', async () => {
    const first = await migrate();
    data = join(root, 'other-data');
    await mkdir(data);
    const second = await migrate();
    expect(second.shares).toEqual(first.shares);
  });

  it('não começa se o destino de backup já existe', async () => {
    const backup = join(root, 'exists');
    await mkdir(backup);
    await writeFile(join(backup, 'preservar.txt'), 'anterior');
    const result = await importPreparedExamples({ dataDirectory: data, backupDestination: backup });
    expect(result.ok).toBe(false);
    expect(await readdir(data)).toEqual([]);
    expect(await readFile(join(backup, 'preservar.txt'), 'utf8')).toBe('anterior');
  });

  it('respeita trava de API/administrador e não cria backup nem dados enquanto ocupada', async () => {
    const unlock = await acquireStorageLock(data);
    try {
      const result = await importPreparedExamples({
        dataDirectory: data,
        backupDestination: join(root, 'locked-backup'),
      });
      expect(result.ok).toBe(false);
      expect(await readdir(data)).toEqual(['.instance-lock']);
      expect(await readdir(root)).not.toContain('locked-backup');
    } finally {
      await unlock();
    }
  });

  it('quota insuficiente preserva obras, mantém backup e não publica shares parciais', async () => {
    const result = await importPreparedExamples({
      dataDirectory: data,
      backupDestination: join(root, 'quota-backup'),
      quotaBytes: 1,
    });
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: 'QUOTA_EXCEEDED' }] });
    expect(await readdir(data)).toEqual([]);
    expect(await readdir(join(root, 'quota-backup'))).toEqual([]);
  });

  it('recusa journal adulterado ou de outro dataset antes de mudar dados', async () => {
    await migrate();
    const altered = await journal();
    altered.datasetHash = '0'.repeat(64);
    await writeFile(join(data, journalName), JSON.stringify(altered));
    const before = hash(await readFile(join(data, journalName)));
    const result = await importPreparedExamples({
      dataDirectory: data,
      backupDestination: join(root, 'wrong-dataset'),
    });
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: 'MIGRATION_CONFLICT' }] });
    expect(hash(await readFile(join(data, journalName)))).toBe(before);
    expect(await readdir(root)).not.toContain('wrong-dataset');
  });

  it('não recria exemplo concluído removido administrativamente e não muda obra divergente', async () => {
    const original = await migrate();
    const first = original.shares[0];
    if (!first) throw new Error('Exemplo ausente.');
    await new FileShareRepository(data).remove(first.shareId);
    const result = await importPreparedExamples({
      dataDirectory: data,
      backupDestination: join(root, 'deleted-backup'),
    });
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: 'MIGRATION_CONFLICT' }] });
    expect((await new FileShareRepository(data).load(first.shareId)).ok).toBe(false);
  });

  it('recusa colisão com UUID existente sem sobrescrever fonte, PNG ou resumo', async () => {
    const original = await migrate();
    const reserved = original.shares[0];
    if (!reserved) throw new Error('Exemplo ausente.');
    data = join(root, 'collision-data');
    await mkdir(data);
    const repository = new FileShareRepository(data);
    const bytes = await readFile('src/infrastructure/legacy-import/generated/example-01.png');
    expect(
      (
        await repository.createImported(
          { formatVersion: 1, characterId: 'capivara', source: 'print 999' },
          bytes,
          { id: reserved.shareId, createdAt: '2020-01-01T00:00:00.000Z' },
        )
      ).ok,
    ).toBe(true);
    const before = await readFile(join(data, reserved.shareId, 'program.json'));
    expect(
      (
        await repository.createImported(
          { formatVersion: 1, characterId: 'arara', source: 'print 0' },
          bytes,
          { id: reserved.shareId, createdAt: '2020-01-01T00:00:00.000Z' },
        )
      ).ok,
    ).toBe(false);
    const result = await importPreparedExamples({
      dataDirectory: data,
      backupDestination: join(root, 'collision-backup'),
    });
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: 'MIGRATION_CONFLICT' }] });
    expect((await readFile(join(data, reserved.shareId, 'program.json'))).equals(before)).toBe(
      true,
    );
    expect((await readdir(data)).filter((entry) => /^[0-9a-f-]{36}$/.test(entry))).toEqual([
      reserved.shareId,
    ]);
  });
});
