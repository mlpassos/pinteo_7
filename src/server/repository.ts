import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { cp, lstat, mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { z } from 'zod';
import { succeed } from '../core/common/index.js';
import type { Result } from '../core/common/index.js';
import { LIMITS, shareEntrySchema, shareSummarySchema } from '../shared/index.js';
import type { ProgramDocument, ShareEntry, SharePage, ShareSummary } from '../shared/index.js';
import { hasErrorCode, serverFailure } from './errors.js';
import { isInside } from './config.js';

const uuidSchema = z.uuid();
const maximumDocumentBytes = 6 * LIMITS.sourceBytes + 4096;
const cursorSchema = z.strictObject({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() });
type Cursor = z.infer<typeof cursorSchema>;

/** Porta de persistência do servidor; não recebe Request nem conhece códigos HTTP. */
export interface ShareRepository {
  /** Persiste documento e PNG já validados como um único registro imutável. */
  create(program: ProgramDocument, png: Buffer): Promise<Result<ShareEntry>>;
  /** Carrega um registro completo ou uma falha controlada. */
  load(id: string): Promise<Result<ShareEntry>>;
  /** Carrega somente o PNG de um registro completo. */
  preview(id: string): Promise<Result<Buffer>>;
  /** Retorna resumos em ordem estável, sem expor staging ou caminhos. */
  list(cursor: string | undefined, limit: number): Promise<Result<SharePage>>;
}

/** Valida UUID na fronteira antes de formar qualquer caminho de arquivo. */
function isShareId(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

/** Decodifica cursor canônico e limitado; o conteúdo nunca vira caminho de disco. */
function decodeCursor(value: string | undefined): Result<Cursor | undefined> {
  if (value === undefined) return succeed(undefined);
  if (value.length === 0 || value.length > LIMITS.cursorLength || /[^A-Za-z0-9_-]/.test(value)) {
    return serverFailure('INVALID_CURSOR', 'O cursor da galeria é inválido.');
  }
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.toString('base64url') !== value)
      return serverFailure('INVALID_CURSOR', 'O cursor da galeria é inválido.');
    const parsed = cursorSchema.safeParse(JSON.parse(bytes.toString('utf8')) as unknown);
    return parsed.success
      ? succeed(parsed.data)
      : serverFailure('INVALID_CURSOR', 'O cursor da galeria é inválido.');
  } catch {
    return serverFailure('INVALID_CURSOR', 'O cursor da galeria é inválido.');
  }
}

/** Ordena por data e UUID; a sequência fica estável mesmo com datas empatadas. */
function compareEntries(left: Cursor, right: Cursor): number {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

/** Remove fonte do resumo retornado na galeria. */
function summary(entry: ShareEntry): ShareSummary {
  return { id: entry.id, createdAt: entry.createdAt, previewUrl: entry.previewUrl };
}

/**
 * Repositório de uma instância. Serializa transações de disco/quota e publica por
 * rename no mesmo filesystem. Falhas não removem obras completas existentes.
 */
export class FileShareRepository implements ShareRepository {
  private readonly directory: string;
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;

  /** Recebe diretório privado e quota em bytes (JSON + PNG + resíduos de staging). */
  constructor(
    directory: string,
    private readonly quotaBytes = 250 * 1024 * 1024,
  ) {
    this.directory = resolve(directory);
  }

  /** Cria somente o diretório privado; nunca apaga staging de outra execução. */
  async initialize(): Promise<Result<void>> {
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const info = await lstat(this.directory);
      if (!info.isDirectory() || info.isSymbolicLink())
        throw new Error('Diretório privado inválido.');
      return succeed(undefined);
    } catch {
      return serverFailure('STORAGE_UNAVAILABLE', 'O armazenamento está indisponível.');
    }
  }

  /** Executa uma transação de cada vez, liberando a fila também em caso de erro. */
  private async exclusive<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
    if (this.pending >= 32)
      return serverFailure(
        'STORAGE_BUSY',
        'O armazenamento está ocupado. Tente novamente em instantes.',
      );
    this.pending += 1;
    const previous = this.tail;
    let release = (): void => {};
    this.tail = new Promise<void>((resolveTail) => {
      release = resolveTail;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
      this.pending -= 1;
    }
  }

  /** Mede todos os arquivos privados; resíduos também consomem quota até revisão. */
  private async measure(directory = this.directory): Promise<number> {
    let total = 0;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Link não permitido.');
      total += entry.isDirectory() ? await this.measure(path) : (await stat(path)).size;
      if (total > this.quotaBytes) return total;
    }
    return total;
  }

  /** Abre apenas arquivo regular, sem seguir links, verificando limite antes da leitura. */
  private async readFile(
    id: string,
    name: 'program.json' | 'preview.png' | 'summary.json',
    maximum: number,
  ): Promise<Buffer> {
    const directory = join(this.directory, id);
    const directoryInfo = await lstat(directory);
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink())
      throw new Error('Registro inválido.');
    const file = await open(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > maximum) throw new Error('Arquivo inválido.');
      return await file.readFile();
    } finally {
      await file.close();
    }
  }

  /** Verifica os três arquivos e o vínculo entre fonte, resumo e diretório. */
  private async readEntry(id: string): Promise<ShareEntry> {
    const bytes = await this.readFile(id, 'program.json', maximumDocumentBytes);
    const entry = shareEntrySchema.parse(JSON.parse(bytes.toString('utf8')) as unknown);
    if (entry.id !== id) throw new Error('Identidade divergente.');
    const metadata = await this.readSummary(id);
    if (metadata.createdAt !== entry.createdAt || metadata.previewUrl !== entry.previewUrl)
      throw new Error('Resumo divergente.');
    await this.verifyFiles(id);
    return entry;
  }

  /** Lê apenas o resumo privado limitado, validando seu vínculo com o diretório. */
  private async readSummary(id: string): Promise<ShareSummary> {
    const bytes = await this.readFile(id, 'summary.json', 2048);
    const parsed = shareSummarySchema.parse(JSON.parse(bytes.toString('utf8')) as unknown);
    if (parsed.id !== id) throw new Error('Identidade divergente.');
    return parsed;
  }

  /** Confirma arquivos regulares e limites sem carregar PNG/fonte na paginação. */
  private async verifyFiles(id: string): Promise<void> {
    for (const [name, maximum] of [
      ['program.json', maximumDocumentBytes],
      ['preview.png', LIMITS.pngBytes],
    ] as const) {
      const file = await open(
        join(this.directory, id, name),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const info = await file.stat();
        if (!info.isFile() || info.size > maximum) throw new Error('Registro inválido.');
      } finally {
        await file.close();
      }
    }
  }

  /** Persiste fonte, resumo e PNG antes do único rename que torna a obra visível. */
  async create(program: ProgramDocument, png: Buffer): Promise<Result<ShareEntry>> {
    return this.exclusive(async () => {
      const id = randomUUID();
      const staging = join(this.directory, `.staging-${id}`);
      const entry: ShareEntry = {
        id,
        createdAt: new Date().toISOString(),
        previewUrl: `/api/v1/shares/${id}/preview.png`,
        program,
      };
      const json = Buffer.from(JSON.stringify(entry));
      const metadata = Buffer.from(JSON.stringify(summary(entry)));
      try {
        if ((await this.measure()) + json.length + metadata.length + png.length > this.quotaBytes) {
          return serverFailure(
            'QUOTA_EXCEEDED',
            'O armazenamento está cheio. Nenhuma obra anterior foi removida.',
          );
        }
        await mkdir(staging, { mode: 0o700 });
        await this.writeDurable(join(staging, 'program.json'), json);
        await this.writeDurable(join(staging, 'preview.png'), png);
        await this.writeDurable(join(staging, 'summary.json'), metadata);
        await rename(staging, join(this.directory, id));
        return succeed(entry);
      } catch {
        return serverFailure(
          'STORAGE_UNAVAILABLE',
          'Não foi possível salvar a obra. Tente novamente mais tarde.',
        );
      } finally {
        // Só remove o staging exclusivo desta transação; obras publicadas são imutáveis.
        await rm(staging, { recursive: true, force: true }).catch(() => undefined);
      }
    });
  }

  /** Sincroniza o conteúdo antes da publicação; não sobrescreve arquivos existentes. */
  private async writeDurable(path: string, bytes: Buffer): Promise<void> {
    const file = await open(path, 'wx', 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
  }

  /** Lê JSON validado e confirma que existe PNG correspondente. */
  async load(id: string): Promise<Result<ShareEntry>> {
    if (!isShareId(id)) return serverFailure('INVALID_ID', 'O identificador da obra é inválido.');
    return this.exclusive(async () => {
      try {
        return succeed(await this.readEntry(id));
      } catch (error) {
        if (hasErrorCode(error, 'ENOENT')) {
          try {
            await lstat(this.directory);
          } catch {
            return serverFailure('STORAGE_UNAVAILABLE', 'O armazenamento está indisponível.');
          }
          try {
            await lstat(join(this.directory, id));
          } catch (directoryError) {
            if (hasErrorCode(directoryError, 'ENOENT'))
              return serverFailure('NOT_FOUND', 'Obra não encontrada.');
          }
        }
        return serverFailure('STORAGE_CORRUPT', 'Não foi possível ler a obra armazenada.');
      }
    });
  }

  /** Entrega a imagem somente depois de verificar que o registro está completo. */
  async preview(id: string): Promise<Result<Buffer>> {
    const entry = await this.load(id);
    if (!entry.ok) return entry;
    return this.exclusive(async () => {
      try {
        return succeed(await this.readFile(id, 'preview.png', LIMITS.pngBytes));
      } catch {
        return serverFailure('STORAGE_CORRUPT', 'Não foi possível ler a prévia armazenada.');
      }
    });
  }

  /** Pagina resumos; staging é invisível e corrupção gera erro em vez de omissão silenciosa. */
  async list(cursor: string | undefined, limit: number): Promise<Result<SharePage>> {
    const decoded = decodeCursor(cursor);
    if (!decoded.ok) return decoded;
    if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.maxPageSize)
      return serverFailure('INVALID_LIMIT', 'O limite deve estar entre 1 e 50.');
    return this.exclusive(async () => {
      try {
        const entries: ShareSummary[] = [];
        const after = decoded.value;
        for (const item of await readdir(this.directory, { withFileTypes: true })) {
          if (isShareId(item.name)) {
            if (!item.isDirectory() || item.isSymbolicLink()) throw new Error('Registro inválido.');
            const parsed = await this.readSummary(item.name);
            await this.verifyFiles(item.name);
            if (after === undefined || compareEntries(parsed, after) > 0) {
              entries.push(parsed);
              entries.sort(compareEntries);
              if (entries.length > limit + 1) entries.pop();
            }
          }
        }
        const items = entries.slice(0, limit);
        const last = items.at(-1);
        const nextCursor =
          entries.length > limit && last
            ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString(
                'base64url',
              )
            : null;
        return succeed({ items, nextCursor });
      } catch {
        return serverFailure('STORAGE_UNAVAILABLE', 'A galeria está temporariamente indisponível.');
      }
    });
  }

  /** Remove localmente por UUID; não há rota HTTP para esta operação. */
  async remove(id: string): Promise<Result<void>> {
    if (!isShareId(id)) return serverFailure('INVALID_ID', 'O identificador da obra é inválido.');
    return this.exclusive(async () => {
      try {
        const info = await lstat(join(this.directory, id));
        if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Registro inválido.');
        const retired = join(this.directory, `.removed-${id}`);
        await rename(join(this.directory, id), retired);
        await rm(retired, { recursive: true });
        return succeed(undefined);
      } catch (error) {
        return hasErrorCode(error, 'ENOENT')
          ? serverFailure('NOT_FOUND', 'Obra não encontrada.')
          : serverFailure('STORAGE_UNAVAILABLE', 'Não foi possível remover a obra.');
      }
    });
  }

  /** Copia dados privados para destino novo e externo; usar com a API parada. */
  async backup(destination: string): Promise<Result<void>> {
    if (isInside(this.directory, destination) || isInside(destination, this.directory))
      return serverFailure('INVALID_BACKUP', 'O backup deve ficar fora do diretório de dados.');
    return this.exclusive(async () => {
      try {
        await cp(this.directory, destination, {
          recursive: true,
          errorOnExist: true,
          force: false,
          dereference: false,
          filter: (source) => basename(source) !== '.instance-lock',
        });
        return succeed(undefined);
      } catch {
        return serverFailure(
          'STORAGE_UNAVAILABLE',
          'Não foi possível criar o backup. Preserve os dados originais.',
        );
      }
    });
  }
}
