import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApi, FileShareRepository } from '../../src/server/index.js';
import { createHttpShareStore } from '../../src/infrastructure/http/index.js';

const id = '28b32168-af4f-46d7-a72f-38dc4806a705';
const program = {
  formatVersion: 1,
  source: '; café\nforward 20',
  characterId: 'tartaruga',
} as const;
const entry = {
  id,
  createdAt: '2026-10-24T00:00:00.000Z',
  previewUrl: `/api/v1/shares/${id}/preview.png`,
  program,
};
/** Resposta de rede real, sem bypass do leitor ou do schema do cliente. */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

describe('cliente HTTP da galeria', () => {
  it('envia fonte exata e bytes do PNG apenas ao endpoint fixo, sem credenciais/redirecionamento', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(json({ data: entry }, 201));
    const client = createHttpShareStore(request);
    const result = await client.create(
      program,
      new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    );
    expect(result).toEqual({ ok: true, value: entry });
    expect(request).toHaveBeenCalledOnce();
    const [path, options] = request.mock.calls[0] ?? [];
    expect(path).toBe('/api/v1/shares');
    expect(options).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    if (typeof options?.body !== 'string') throw new Error('Corpo JSON ausente');
    expect(JSON.parse(options.body)).toEqual({ program, pngBase64: 'iVBORw==' });
  });
  it('rejeita entrada local inválida e UUID usado como caminho antes de buscar', async () => {
    const request = vi.fn<typeof fetch>();
    const client = createHttpShareStore(request);
    expect(await client.create(program, new Blob(['x'], { type: 'text/html' }))).toMatchObject({
      ok: false,
    });
    expect(
      await client.create(
        program,
        new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'image/png' }),
      ),
    ).toMatchObject({ ok: false });
    expect(await client.load('../qualquer')).toMatchObject({ ok: false });
    expect(await client.list('x'.repeat(257))).toMatchObject({ ok: false });
    expect(request).not.toHaveBeenCalled();
  });
  it('mantém erros úteis do servidor e trata rede/JSON/HTML inválidos como Result', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({ error: { code: 'RATE_LIMIT', message: 'Aguarde um minuto.' } }, 429),
      )
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(
        new Response('<script>bad</script>', { headers: { 'Content-Type': 'text/html' } }),
      )
      .mockResolvedValueOnce(
        new Response('{', { headers: { 'Content-Type': 'application/json' } }),
      );
    const client = createHttpShareStore(request);
    expect(await client.load(id)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'RATE_LIMIT', message: 'Aguarde um minuto.' }],
    });
    for (let count = 0; count < 3; count++)
      expect(await client.load(id)).toMatchObject({ ok: false });
    expect(program.source).toBe('; café\nforward 20');
  });
  it('recusa obra divergente do ID solicitado e URL de prévia externa', async () => {
    const other = '11111111-1111-4111-8111-111111111111';
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({ data: { ...entry, id: other, previewUrl: `/api/v1/shares/${other}/preview.png` } }),
      )
      .mockResolvedValueOnce(
        json({ data: { ...entry, previewUrl: 'https://example.org/externa.png' } }),
      );
    const client = createHttpShareStore(request);
    expect(await client.load(id)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'SHARE_INVALID_RESPONSE' }],
    });
    expect(await client.load(id)).toMatchObject({ ok: false });
  });
  it('limita stream sem Content-Length e cancela antes de acumular a resposta inteira', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(64 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
    expect(await createHttpShareStore(request).load(id)).toMatchObject({ ok: false });
    expect(cancelled).toBe(true);
  });
  it('pagina por cursor opaco escapado e valida todos os resumos recebidos', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: { items: [], nextCursor: null } }))
      .mockResolvedValueOnce(json({ data: { items: [entry], nextCursor: null } }));
    const client = createHttpShareStore(request);
    expect(await client.list('a&b=2')).toEqual({
      ok: true,
      value: { items: [], nextCursor: null },
    });
    expect(request.mock.calls[0]?.[0]).toBe('/api/v1/shares?cursor=a%26b%3D2');
    expect(await client.list()).toMatchObject({ ok: false });
  });
});

it('cria, lista e carrega pelo envelope HTTP real com repositório e PNG reais', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pinteo7-client-'));
  try {
    const repository = new FileShareRepository(directory, 20 * 1024 * 1024);
    expect(await repository.initialize()).toMatchObject({ ok: true });
    const api = createApi({ repository, publicOrigin: 'http://127.0.0.1:5180' });
    const request: typeof fetch = async (input, init) => {
      const path =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return api.fetch(new Request(new URL(path, 'http://127.0.0.1:5180'), init), {
        peerAddress: '127.0.0.1',
      });
    };
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 4, background: '#cc6633' },
    })
      .png()
      .toBuffer();
    const client = createHttpShareStore(request);
    const created = await client.create(
      program,
      new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
    );
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) throw new Error('Criação real falhou');
    expect(await client.load(created.value.id)).toEqual(created);
    const listed = await client.list();
    expect(listed).toMatchObject({
      ok: true,
      value: { items: [{ id: created.value.id }], nextCursor: null },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('encerra a requisição mesmo quando cabeçalhos recusam um corpo ainda pendente', async () => {
  let signal: AbortSignal | null | undefined;
  const request: typeof fetch = (_input, init) => {
    signal = init?.signal;
    return Promise.resolve(
      new Response(new ReadableStream<Uint8Array>(), {
        headers: { 'Content-Type': 'text/html' },
      }),
    );
  };
  expect(await createHttpShareStore(request).load(id)).toMatchObject({ ok: false });
  expect(signal?.aborted).toBe(true);
});
