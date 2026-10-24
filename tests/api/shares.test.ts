import { randomUUID } from 'node:crypto';
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as nodeRequest } from 'node:http';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createApi,
  FileShareRepository,
  readServerConfig,
  startApiServer,
} from '../../src/server/index.js';
import { acquireStorageLock } from '../../src/server/runtime.js';
import { clientAddress, WriteRateLimiter } from '../../src/server/service.js';
import {
  apiErrorSchema,
  LIMITS,
  shareEntrySchema,
  sharePageSchema,
} from '../../src/shared/index.js';
import type { ProgramDocument } from '../../src/shared/index.js';
import type { ShareRepository } from '../../src/server/index.js';

const origin = 'http://127.0.0.1:5177';
const program: ProgramDocument = {
  formatVersion: 1,
  characterId: 'tartaruga',
  source: 'repeat 4 [fw 20 rt 90]',
};
const entryEnvelope = z.strictObject({ data: shareEntrySchema });
const pageEnvelope = z.strictObject({ data: sharePageSchema });

let directory: string;
let png: Buffer;
let repository: FileShareRepository;
let app: ReturnType<typeof createApi>;
const closers: (() => Promise<void>)[] = [];

/** Faz requisição pela fronteira Fetch usando socket simulado, nunca por header arbitrário. */
async function call(
  path: string,
  init?: RequestInit,
  peerAddress = '127.0.0.1',
): Promise<Response> {
  return app.fetch(new Request(`${origin}${path}`, init), { peerAddress });
}

/** Cria pela API com JSON real; testes de schema podem passar dados desconhecidos. */
async function post(payload: unknown, peerAddress = '127.0.0.1'): Promise<Response> {
  return call(
    '/api/v1/shares',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    peerAddress,
  );
}

/** Gera corpo de criação padrão sem transformar o conteúdo do documento. */
function payload(document: ProgramDocument = program): unknown {
  return { program: document, pngBase64: png.toString('base64') };
}

/** Assegura erro contratual, status e ausência de caminhos/stack nas respostas. */
async function expectError(response: Response, status: number, code?: string): Promise<void> {
  expect(response.status).toBe(status);
  const error = apiErrorSchema.parse((await response.json()) as unknown);
  if (code) expect(error.error.code).toBe(code);
  expect(error.error.message).not.toContain(directory);
  expect(error.error.message).not.toContain('Error:');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pinteo7-api-'));
  png = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff7755' } })
    .png()
    .toBuffer();
  repository = new FileShareRepository(directory);
  expect((await repository.initialize()).ok).toBe(true);
  app = createApi({ repository, publicOrigin: origin });
});

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  await rm(directory, { recursive: true, force: true });
});

describe('API e persistência reais', () => {
  it('cria, lista, reabre e entrega PNG depois de reiniciar o servidor HTTP', async () => {
    const config = {
      dataDirectory: directory,
      publicOrigin: origin,
      port: 0,
      quotaBytes: 250 * 1024 * 1024,
      trustLocalProxy: false,
    };
    const first = await startApiServer(config, process.cwd());
    closers.push(first.close);
    const address = first.server.address();
    if (typeof address !== 'object' || address === null) throw new Error('Socket não iniciou.');
    const url = `http://127.0.0.1:${String(address.port)}`;
    const response = await fetch(`${url}/api/v1/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    expect(response.status).toBe(201);
    const entry = entryEnvelope.parse((await response.json()) as unknown).data;
    expect(response.headers.get('location')).toBe(`/api/v1/shares/${entry.id}`);
    expect(entry.program).toEqual(program);
    expect(first.server.address()).toMatchObject({ address: '127.0.0.1' });
    await first.close();

    const second = await startApiServer(config, process.cwd());
    closers.push(second.close);
    const secondAddress = second.server.address();
    if (typeof secondAddress !== 'object' || secondAddress === null)
      throw new Error('Socket não iniciou.');
    const restartedUrl = `http://127.0.0.1:${String(secondAddress.port)}`;
    const loaded = entryEnvelope.parse(
      (await (await fetch(`${restartedUrl}/api/v1/shares/${entry.id}`)).json()) as unknown,
    ).data;
    expect(loaded).toEqual(entry);
    const list = pageEnvelope.parse(
      (await (await fetch(`${restartedUrl}/api/v1/shares`)).json()) as unknown,
    ).data;
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).not.toHaveProperty('program');
    const preview = await fetch(`${restartedUrl}${entry.previewUrl}`);
    expect(preview.headers.get('content-type')).toBe('image/png');
    expect(preview.headers.get('x-content-type-options')).toBe('nosniff');
    expect((await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).width).toBe(8);
  });

  it('preserva rascunho inválido e caracteres que expandem ao serializar JSON', async () => {
    const document = { ...program, source: '\u0001'.repeat(LIMITS.sourceBytes) };
    const response = await post(payload(document));
    expect(response.status).toBe(201);
    const entry = entryEnvelope.parse((await response.json()) as unknown).data;
    const restarted = new FileShareRepository(directory);
    expect((await restarted.initialize()).ok).toBe(true);
    const result = await restarted.load(entry.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.program.source).toBe(document.source);
    expect((await readFile(join(directory, entry.id, 'program.json'))).length).toBeGreaterThan(
      100 * 1024,
    );
  });

  it('não executa HTML ou LOGO e retorna o texto integral em JSON', async () => {
    const source = '<script>globalThis.executado=true</script>\nrepeat [';
    const response = await post(payload({ ...program, source }));
    expect(response.status).toBe(201);
    const entry = entryEnvelope.parse((await response.json()) as unknown).data;
    expect(entry.program.source).toBe(source);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(globalThis).not.toHaveProperty('executado');
  });

  it('pagina sem repetir obras e ignora diretórios temporários', async () => {
    for (let index = 0; index < 4; index += 1)
      expect((await repository.create({ ...program, source: String(index) }, png)).ok).toBe(true);
    await mkdir(join(directory, `.staging-${randomUUID()}`));
    await writeFile(join(directory, 'arquivo-privado.txt'), 'segredo');
    const first = pageEnvelope.parse(
      (await (await call('/api/v1/shares?limit=2')).json()) as unknown,
    ).data;
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const second = pageEnvelope.parse(
      (await (
        await call(`/api/v1/shares?limit=2&cursor=${encodeURIComponent(first.nextCursor ?? '')}`)
      ).json()) as unknown,
    ).data;
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((entry) => entry.id)).size).toBe(4);
  });

  it('health não revela armazenamento e outros arquivos não são servidos', async () => {
    expect(await (await call('/api/health')).json()).toEqual({ status: 'ok' });
    await expectError(await call('/program.json'), 404);
    await expectError(await call('/api/admin/remove'), 404);
  });

  it.each(['PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'])(
    'recusa %s com 405 e Allow',
    async (method) => {
      const response = await call('/api/v1/shares', { method });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, POST');
    },
  );
});

describe('fronteiras de entrada e imagem', () => {
  it.each([
    { value: { ...program, characterId: '../../etc/passwd' }, status: 422 },
    { value: { ...program, formatVersion: 2 }, status: 422 },
    { value: { ...program, html: '<script>' }, status: 422 },
    { value: { ...program, source: 3 }, status: 422 },
  ])('rejeita documento fora do contrato $status', async ({ value, status }) => {
    await expectError(await post({ program: value, pngBase64: png.toString('base64') }), status);
    expect(await readdir(directory)).toEqual([]);
  });

  it('rejeita propriedades extras do envelope e base64 não canônico', async () => {
    await expectError(
      await post({ program, pngBase64: png.toString('base64'), id: randomUUID() }),
      400,
    );
    await expectError(
      await post({ program, pngBase64: 'https://exemplo.invalid/imagem.png' }),
      400,
    );
    await expectError(await post({ program, pngBase64: 'abcd\n' }), 400);
  });

  it('valida fonte por bytes UTF-8, incluindo o limite exato', async () => {
    expect((await post(payload({ ...program, source: 'á'.repeat(10 * 1024) }))).status).toBe(201);
    await expectError(
      await post(payload({ ...program, source: 'á'.repeat(10 * 1024) + 'a' })),
      413,
      'TOO_LARGE',
    );
  });

  it.each(['text/plain', 'text/plain; application/json', 'application/x-www-form-urlencoded'])(
    'recusa tipo %s',
    async (type) => {
      await expectError(
        await call('/api/v1/shares', {
          method: 'POST',
          headers: { 'Content-Type': type },
          body: '{}',
        }),
        415,
      );
    },
  );

  it('recusa compressão, JSON malformado e tamanho declarado excessivo', async () => {
    await expectError(
      await call('/api/v1/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
        body: '{}',
      }),
      415,
    );
    await expectError(
      await call('/api/v1/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
      400,
    );
    await expectError(
      await call('/api/v1/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(LIMITS.requestBytes + 1),
        },
        body: '{}',
      }),
      413,
    );
  });

  it('conta o stream real sem confiar em Content-Length menor', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(LIMITS.requestBytes));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: 'half' } = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '1' },
      body,
      duplex: 'half',
    };
    await expectError(await call('/api/v1/shares', init), 413);
  });

  it('limita corpo chunked pelo socket HTTP real sem Content-Length', async () => {
    const running = await startApiServer(
      {
        dataDirectory: directory,
        publicOrigin: origin,
        port: 0,
        quotaBytes: 250 * 1024 * 1024,
        trustLocalProxy: false,
      },
      process.cwd(),
    );
    closers.push(running.close);
    const address = running.server.address();
    if (typeof address !== 'object' || address === null) throw new Error('Socket não iniciou.');
    const status = await new Promise<number | undefined>((resolveStatus, reject) => {
      const request = nodeRequest(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: '/api/v1/shares',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (response) => {
          response.resume();
          response.on('end', () => {
            resolveStatus(response.statusCode);
          });
        },
      );
      request.on('error', reject);
      request.write(Buffer.alloc(LIMITS.requestBytes));
      request.end(Buffer.alloc(1));
    });
    expect(status).toBe(413);
  });

  it('rejeita UTF-8 inválido antes da interpretação JSON', async () => {
    await expectError(
      await call('/api/v1/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: new Uint8Array([0xff, 0xfe]),
      }),
      400,
    );
  });

  it('rejeita bytes decodificados maiores que 2 MiB', async () => {
    await expectError(
      await post({ program, pngBase64: Buffer.alloc(LIMITS.pngBytes + 1).toString('base64') }),
      413,
    );
  });

  it('recusa imagem que não é PNG e PNG truncado', async () => {
    const jpeg = await sharp(png).jpeg().toBuffer();
    await expectError(
      await post({ program, pngBase64: jpeg.toString('base64') }),
      422,
      'INVALID_PNG',
    );
    await expectError(
      await post({ program, pngBase64: png.subarray(0, 20).toString('base64') }),
      422,
    );
  });

  it.each([
    { width: 2049, height: 1 },
    { width: 2049, height: 2049 },
  ])('recusa dimensões e bomba de pixels $width × $height', async ({ width, height }) => {
    const oversized = await sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
      .png()
      .toBuffer();
    await expectError(await post({ program, pngBase64: oversized.toString('base64') }), 422);
  });

  it('reencoda eliminando metadados e bytes anexados', async () => {
    const tagged = await sharp(png)
      .withMetadata({ exif: { IFD0: { Artist: 'Não publicar metadados' } } })
      .png()
      .toBuffer();
    const input = Buffer.concat([tagged, Buffer.from('<script>ignorar</script>')]);
    const response = await post({ program, pngBase64: input.toString('base64') });
    expect(response.status).toBe(201);
    const entry = entryEnvelope.parse((await response.json()) as unknown).data;
    const output = Buffer.from(await (await call(entry.previewUrl)).arrayBuffer());
    expect(output.includes(Buffer.from('<script>'))).toBe(false);
    expect((await sharp(output).metadata()).exif).toBeUndefined();
  });
});

describe('origem, IP, limitação e disco', () => {
  it('recusa origem estrangeira e não envia credenciais CORS', async () => {
    const response = await call('/api/v1/shares', {
      method: 'POST',
      headers: { Origin: 'https://invasor.invalid', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    await expectError(response, 403, 'INVALID_ORIGIN');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    const same = await call('/api/health', { headers: { Origin: origin } });
    expect(same.headers.get('access-control-allow-origin')).toBe(origin);
    expect(same.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('não permite driblar 5/minuto alterando X-Forwarded-For sem confiança', async () => {
    for (let index = 0; index < 5; index += 1) {
      expect(
        (
          await call('/api/v1/shares', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Forwarded-For': `192.0.2.${String(index + 1)}`,
            },
            body: JSON.stringify(payload()),
          })
        ).status,
      ).toBe(201);
    }
    const response = await post(payload());
    await expectError(response, 429);
    expect(response.headers.get('retry-after')).toBe('60');
  });

  it('só confia em proxy habilitado e socket local; recusa cadeias e expira janelas', () => {
    expect(clientAddress('203.0.113.1', '192.0.2.1', true)).toEqual({
      ok: true,
      value: '203.0.113.1',
    });
    expect(clientAddress('::ffff:127.0.0.1', '192.0.2.1', true)).toEqual({
      ok: true,
      value: '192.0.2.1',
    });
    expect(clientAddress('::1', '192.0.2.1, 127.0.0.1', true).ok).toBe(false);
    const limiter = new WriteRateLimiter();
    for (let index = 0; index < 5; index += 1)
      expect(limiter.consume('192.0.2.1', 0).ok).toBe(true);
    expect(limiter.consume('192.0.2.1', 59_999).ok).toBe(false);
    expect(limiter.consume('192.0.2.1', 60_000).ok).toBe(true);
  });

  it.each([
    '/api/v1/shares/..%2Fsegredo',
    '/api/v1/shares/não-uuid',
    '/api/v1/shares/..%2Fsegredo/preview.png',
    '/api/v1/shares?cursor=..%2Fsegredo',
    '/api/v1/shares?limit=51',
    '/api/v1/shares?limit=0',
    '/api/v1/shares?limit=1&limit=2',
    '/api/v1/shares?arquivo=segredo',
  ])('recusa ID/cursor/parâmetros inválidos %s', async (path) => {
    await expectError(await call(path), 400);
  });

  it('responde 404 a UUID inexistente', async () => {
    await expectError(await call(`/api/v1/shares/${randomUUID()}`), 404);
  });

  it('quota serializada admite uma escrita concorrente sem remover a obra anterior', async () => {
    const first = await repository.create(program, png);
    if (!first.ok) throw new Error('Fixture não persistiu.');
    const bytes = (
      await Promise.all(
        (await readdir(join(directory, first.value.id))).map(
          async (name) => (await readFile(join(directory, first.value.id, name))).length,
        ),
      )
    ).reduce((sum, length) => sum + length, 0);
    repository = new FileShareRepository(directory, bytes * 2 + 10);
    const results = await Promise.all([
      repository.create(program, png),
      repository.create(program, png),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect((await repository.load(first.value.id)).ok).toBe(true);
    expect((await readdir(directory)).some((name) => name.startsWith('.staging-'))).toBe(false);
  });

  it('quota pela HTTP retorna 503 sem registro parcial', async () => {
    app = createApi({ repository: new FileShareRepository(directory, 1), publicOrigin: origin });
    await expectError(await post(payload()), 503, 'QUOTA_EXCEEDED');
    expect(await readdir(directory)).toEqual([]);
  });

  it('falha de disco real é controlada e não altera armazenamento anterior', async () => {
    const result = await repository.create(program, png);
    if (!result.ok) throw new Error('Fixture não persistiu.');
    const unavailable = join(directory, 'arquivo-em-vez-de-diretório');
    await writeFile(unavailable, 'arquivo');
    app = createApi({ repository: new FileShareRepository(unavailable), publicOrigin: origin });
    await expectError(await post(payload()), 503, 'STORAGE_UNAVAILABLE');
    expect((await repository.load(result.value.id)).ok).toBe(true);
  });

  it('falha de permissão durante escrita retorna 503, preserva obra e permite recuperar', async () => {
    const result = await repository.create(program, png);
    if (!result.ok) throw new Error('Fixture não persistiu.');
    await chmod(directory, 0o500);
    try {
      await expectError(await post(payload()), 503, 'STORAGE_UNAVAILABLE');
      expect(await readdir(directory)).toEqual([result.value.id]);
      expect((await repository.load(result.value.id)).ok).toBe(true);
    } finally {
      await chmod(directory, 0o700);
    }
    expect((await post(payload())).status).toBe(201);
  });

  it('falha inesperada vira 500 e log sem stack, caminhos ou conteúdo privado', async () => {
    const broken: ShareRepository = {
      create: () => Promise.reject(new Error(`segredo: ${directory} ${program.source}`)),
      list: (cursor, limit) => repository.list(cursor, limit),
      load: (id) => repository.load(id),
      preview: (id) => repository.preview(id),
    };
    app = createApi({ repository: broken, publicOrigin: origin });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expectError(await post(payload()), 500, 'UNEXPECTED');
      expect(log).toHaveBeenCalledExactlyOnceWith('Falha inesperada na API (UNEXPECTED).');
    } finally {
      log.mockRestore();
    }
  });

  it('detecta JSON corrompido, registro incompleto e link simbólico sem expor arquivos', async () => {
    const result = await repository.create(program, png);
    if (!result.ok) throw new Error('Fixture não persistiu.');
    await writeFile(join(directory, result.value.id, 'program.json'), '{quebrado');
    await expectError(await call(`/api/v1/shares/${result.value.id}`), 503, 'STORAGE_CORRUPT');
    await rm(join(directory, result.value.id, 'preview.png'));
    await expectError(await call('/api/v1/shares'), 503);
    await symlink(
      join(directory, 'arquivo-privado'),
      join(directory, result.value.id, 'preview.png'),
    );
    await expectError(await call(`/api/v1/shares/${result.value.id}/preview.png`), 503);
  });

  it.each(['corrompido', 'ausente'])(
    'recusa registro com resumo %s sem alterar a fonte original',
    async (condition) => {
      const result = await repository.create(program, png);
      if (!result.ok) throw new Error('Fixture não persistiu.');
      const original = await readFile(join(directory, result.value.id, 'program.json'));
      if (condition === 'corrompido')
        await writeFile(join(directory, result.value.id, 'summary.json'), '{');
      else await rm(join(directory, result.value.id, 'summary.json'));
      await expectError(await call('/api/v1/shares'), 503);
      expect(await readFile(join(directory, result.value.id, 'program.json'))).toEqual(original);
      await expectError(await call(`/api/v1/shares/${result.value.id}`), 503, 'STORAGE_CORRUPT');
    },
  );

  it('criações simultâneas publicam somente obras completas e IDs únicos', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => post(payload(), `192.0.2.${String(index + 1)}`)),
    );
    expect(results.filter((result) => result.status === 201)).toHaveLength(2);
    expect(results.filter((result) => result.status === 503)).toHaveLength(6);
    const listed = pageEnvelope.parse(
      (await (await call('/api/v1/shares')).json()) as unknown,
    ).data;
    expect(new Set(listed.items.map((entry) => entry.id)).size).toBe(2);
    for (const item of listed.items) {
      expect((await call(`/api/v1/shares/${item.id}`)).status).toBe(200);
      expect((await call(item.previewUrl)).status).toBe(200);
    }
    expect((await readdir(directory)).some((name) => name.startsWith('.staging-'))).toBe(false);
  });

  it('fila de disco tem teto e retorna 503 sem acumular trabalho ilimitado', async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, () => repository.list(undefined, 20)),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(32);
    expect(results.filter((result) => !result.ok)).toHaveLength(8);
  });
});

describe('operação local e configuração', () => {
  it('remoção por UUID é local e backup pode restaurar obras sem copiar trava', async () => {
    const result = await repository.create(program, png);
    if (!result.ok) throw new Error('Fixture não persistiu.');
    const unlock = await acquireStorageLock(directory);
    closers.push(unlock);
    const backup = join(directory, '..', `pinteo7-backup-${randomUUID()}`);
    try {
      expect((await repository.backup(backup)).ok).toBe(true);
      expect(await readdir(backup)).not.toContain('.instance-lock');
      const restored = new FileShareRepository(backup);
      expect((await restored.load(result.value.id)).ok).toBe(true);
      expect((await repository.remove('../segredo')).ok).toBe(false);
      expect((await repository.remove(result.value.id)).ok).toBe(true);
      expect((await repository.load(result.value.id)).ok).toBe(false);
      expect((await restored.load(result.value.id)).ok).toBe(true);
      expect((await repository.backup(directory)).ok).toBe(false);
    } finally {
      await rm(backup, { recursive: true, force: true });
    }
  });

  it('trava impede segundo processo e liberação permite retomar', async () => {
    const unlock = await acquireStorageLock(directory);
    await expect(acquireStorageLock(directory)).rejects.toThrow();
    await unlock();
    const nextUnlock = await acquireStorageLock(directory);
    await nextUnlock();
  });

  it('exige origem e dados externos ao checkout e normaliza origem válida', () => {
    expect(() => readServerConfig({}, process.cwd())).toThrow();
    expect(() =>
      readServerConfig(
        { PINTEO7_DATA_DIR: join(process.cwd(), 'public/data'), PINTEO7_PUBLIC_ORIGIN: origin },
        process.cwd(),
      ),
    ).toThrow();
    expect(() =>
      readServerConfig(
        { PINTEO7_DATA_DIR: directory, PINTEO7_PUBLIC_ORIGIN: `${origin}/api` },
        process.cwd(),
      ),
    ).toThrow();
    expect(() =>
      readServerConfig(
        {
          PINTEO7_DATA_DIR: directory,
          PINTEO7_PUBLIC_ORIGIN: origin,
          PINTEO7_TRUST_LOCAL_PROXY: 'yes',
        },
        process.cwd(),
      ),
    ).toThrow();
    expect(
      readServerConfig(
        { PINTEO7_DATA_DIR: directory, PINTEO7_PUBLIC_ORIGIN: `${origin}/` },
        process.cwd(),
      ),
    ).toMatchObject({
      publicOrigin: origin,
      port: 5178,
      trustLocalProxy: false,
      quotaBytes: 250 * 1024 * 1024,
    });
  });
});
