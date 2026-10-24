import { Hono } from 'hono';
import type { Context } from 'hono';
import { LIMITS } from '../shared/index.js';
import { succeed } from '../core/common/index.js';
import type { Result } from '../core/common/index.js';
import { errorStatus, serverFailure } from './errors.js';
import type { ShareRepository } from './repository.js';
import { clientAddress, ShareService, WriteRateLimiter } from './service.js';

/** Dados exclusivos do adaptador Node, nunca derivados de headers HTTP. */
export type ApiEnvironment = { Bindings: { peerAddress: string } };

/** Opções explícitas da fronteira HTTP. */
export type ApiOptions = Readonly<{
  repository: ShareRepository;
  publicOrigin: string;
  trustLocalProxy?: boolean;
}>;

/** Traduz Result em erro JSON público sem vazar objetos de exceção. */
function failureResponse(
  context: Context<ApiEnvironment>,
  result: Readonly<{ ok: false; diagnostics: readonly { code: string; message: string }[] }>,
): Response {
  const diagnostic = result.diagnostics[0] ?? {
    code: 'UNEXPECTED',
    message: 'Não foi possível concluir a solicitação.',
  };
  if (diagnostic.code === 'RATE_LIMITED') context.header('Retry-After', '60');
  if (['IMAGE_BUSY', 'STORAGE_BUSY'].includes(diagnostic.code)) context.header('Retry-After', '1');
  return context.json(
    { error: { code: diagnostic.code, message: diagnostic.message } },
    errorStatus(diagnostic.code),
  );
}

/** Lê o stream real com teto mesmo sem Content-Length ou com header menor que o corpo. */
async function readJson(request: Request): Promise<Result<unknown>> {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^[0-9]+$/.test(length) || !Number.isSafeInteger(Number(length))))
    return serverFailure('INVALID_REQUEST', 'O tamanho informado para a solicitação é inválido.');
  if (length !== null && Number(length) > LIMITS.requestBytes)
    return serverFailure('TOO_LARGE', 'A solicitação deve ter no máximo 3 MiB.');
  if (!request.body) return serverFailure('INVALID_REQUEST', 'Envie um corpo JSON.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > LIMITS.requestBytes) {
        await reader.cancel();
        return serverFailure('TOO_LARGE', 'A solicitação deve ter no máximo 3 MiB.');
      }
      chunks.push(chunk.value);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    return succeed(JSON.parse(text) as unknown);
  } catch {
    return serverFailure('INVALID_REQUEST', 'Não foi possível ler um JSON UTF-8 válido.');
  } finally {
    reader.releaseLock();
  }
}

/** Conhece apenas rotas contratuais; identifica métodos proibidos sem expor disco. */
function allowedMethods(path: string): string | undefined {
  if (path === '/api/health') return 'GET';
  if (path === '/api/v1/shares') return 'GET, POST';
  if (/^\/api\/v1\/shares\/[^/]+(?:\/preview\.png)?$/.test(path)) return 'GET';
  return undefined;
}

/** Constrói uma API real e isolável; a origem é fixa e o socket é injetado pelo Node. */
export function createApi(options: ApiOptions): Hono<ApiEnvironment> {
  if (new URL(options.publicOrigin).origin !== options.publicOrigin)
    throw new Error('Origem pública inválida.');
  const app = new Hono<ApiEnvironment>();
  const service = new ShareService(options.repository);
  const limiter = new WriteRateLimiter();

  app.use('*', async (context, next) => {
    context.header('X-Content-Type-Options', 'nosniff');
    context.header('Cache-Control', 'no-store');
    context.header('Vary', 'Origin');
    const origin = context.req.header('Origin');
    if (origin !== undefined && origin !== options.publicOrigin)
      return context.json(
        {
          error: { code: 'INVALID_ORIGIN', message: 'A origem desta solicitação não é permitida.' },
        },
        403,
      );
    if (origin !== undefined) context.header('Access-Control-Allow-Origin', options.publicOrigin);
    const allowed = allowedMethods(context.req.path);
    if (allowed && !allowed.split(', ').includes(context.req.method)) {
      context.header('Allow', allowed);
      return context.json(
        { error: { code: 'METHOD_NOT_ALLOWED', message: 'Este método não está disponível.' } },
        405,
      );
    }
    await next();
  });

  app.get('/api/health', (context) => context.json({ status: 'ok' }));

  app.post('/api/v1/shares', async (context) => {
    const address = clientAddress(
      context.env.peerAddress,
      context.req.header('X-Forwarded-For'),
      options.trustLocalProxy ?? false,
    );
    if (!address.ok) return failureResponse(context, address);
    const allowed = limiter.consume(address.value);
    if (!allowed.ok) return failureResponse(context, allowed);
    const type = context.req.header('Content-Type')?.split(';')[0]?.trim().toLowerCase();
    if (
      type !== 'application/json' ||
      !['identity', undefined].includes(context.req.header('Content-Encoding')?.toLowerCase())
    )
      return failureResponse(
        context,
        serverFailure('UNSUPPORTED_MEDIA', 'Envie application/json sem compressão.'),
      );
    const reservation = service.reserve();
    if (!reservation.ok) return failureResponse(context, reservation);
    try {
      const payload = await readJson(context.req.raw);
      if (!payload.ok) return failureResponse(context, payload);
      const result = await service.create(payload.value);
      if (!result.ok) return failureResponse(context, result);
      context.header('Location', `/api/v1/shares/${result.value.id}`);
      return context.json({ data: result.value }, 201);
    } finally {
      reservation.value();
    }
  });

  app.get('/api/v1/shares', async (context) => {
    const query = new URL(context.req.url).searchParams;
    if (
      [...query.keys()].some((key) => !['cursor', 'limit'].includes(key)) ||
      query.getAll('cursor').length > 1 ||
      query.getAll('limit').length > 1
    )
      return failureResponse(
        context,
        serverFailure('INVALID_REQUEST', 'Os parâmetros da galeria são inválidos.'),
      );
    const rawLimit = query.get('limit');
    if (rawLimit !== null && !/^[1-9][0-9]?$/.test(rawLimit))
      return failureResponse(
        context,
        serverFailure('INVALID_LIMIT', 'O limite deve estar entre 1 e 50.'),
      );
    const result = await options.repository.list(
      query.get('cursor') ?? undefined,
      rawLimit === null ? LIMITS.pageSize : Number(rawLimit),
    );
    return result.ok ? context.json({ data: result.value }) : failureResponse(context, result);
  });

  app.get('/api/v1/shares/:id/preview.png', async (context) => {
    const result = await options.repository.preview(context.req.param('id'));
    if (!result.ok) return failureResponse(context, result);
    context.header('Content-Type', 'image/png');
    return context.body(new Uint8Array(result.value));
  });

  app.get('/api/v1/shares/:id', async (context) => {
    const result = await options.repository.load(context.req.param('id'));
    return result.ok ? context.json({ data: result.value }) : failureResponse(context, result);
  });

  app.notFound((context) =>
    context.json({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } }, 404),
  );
  app.onError((_error, context) => {
    console.error('Falha inesperada na API (UNEXPECTED).');
    return context.json(
      { error: { code: 'UNEXPECTED', message: 'Não foi possível concluir a solicitação.' } },
      500,
    );
  });
  return app;
}
