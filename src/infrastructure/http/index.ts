import { z } from 'zod';
import type { ShareStore } from '../../application/index.js';
import { fail, succeed, type Result } from '../../core/common/index.js';
import {
  LIMITS,
  apiErrorSchema,
  programDocumentSchema,
  shareEntrySchema,
  sharePageSchema,
} from '../../shared/index.js';

const responseLimit = 256 * 1024;

/** Lê JSON com teto de bytes, inclusive quando Content-Length não é enviado. */
async function boundedJson(response: Response): Promise<unknown> {
  if (response.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    throw new Error('Resposta inesperada.');
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > responseLimit))
    throw new Error('Resposta excessiva.');
  if (!response.body) throw new Error('Resposta vazia.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > responseLimit) throw new Error('Resposta excessiva.');
      chunks.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
}

/** Codifica apenas o PNG local limitado, sem data URL ou carregamento de URL externa. */
async function pngBase64(png: Blob): Promise<string> {
  const bytes = new Uint8Array(await png.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 16384)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  return btoa(binary);
}

/** Cliente same-origin com schema, resposta limitada e timeout; nenhuma chamada executa LOGO. */
export function createHttpShareStore(request: typeof fetch = fetch): ShareStore {
  /** Valida a resposta antes de expô-la à UI e nunca segue redirecionamentos externos. */
  async function send<T>(path: string, schema: z.ZodType<T>, body?: string): Promise<Result<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 15000);
    try {
      const response = await request(path, {
        method: body === undefined ? 'GET' : 'POST',
        ...(body === undefined ? {} : { body, headers: { 'Content-Type': 'application/json' } }),
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal,
      });
      const data = await boundedJson(response);
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(data);
        return error.success
          ? fail({ code: error.data.error.code, message: error.data.error.message })
          : fail({
              code: 'SHARE_HTTP_ERROR',
              message: 'Não foi possível acessar a galeria. Tente novamente.',
            });
      }
      const parsed = z.strictObject({ data: schema }).safeParse(data);
      return parsed.success
        ? succeed(parsed.data.data)
        : fail({
            code: 'SHARE_INVALID_RESPONSE',
            message: 'A galeria enviou dados inválidos. Seu programa foi preservado.',
          });
    } catch {
      return fail({
        code: 'SHARE_UNAVAILABLE',
        message:
          'Não foi possível conectar à galeria. Seu programa foi preservado; tente novamente.',
      });
    } finally {
      controller.abort();
      clearTimeout(timer);
    }
  }
  return {
    async create(program, png) {
      const parsed = programDocumentSchema.safeParse(program);
      if (
        !parsed.success ||
        png.size === 0 ||
        png.size > LIMITS.pngBytes ||
        png.type !== 'image/png'
      )
        return fail({
          code: 'SHARE_INVALID_INPUT',
          message: 'Confira o programa e a imagem PNG antes de compartilhar.',
        });
      try {
        return await send(
          '/api/v1/shares',
          shareEntrySchema,
          JSON.stringify({
            program: parsed.data,
            pngBase64: await pngBase64(png),
          }),
        );
      } catch {
        return fail({
          code: 'SHARE_IMAGE_ERROR',
          message: 'Não foi possível preparar a imagem. Seu programa foi preservado.',
        });
      }
    },
    list(cursor) {
      if (cursor !== undefined && (cursor.length === 0 || cursor.length > LIMITS.cursorLength))
        return Promise.resolve(
          fail({ code: 'INVALID_CURSOR', message: 'A página da galeria é inválida.' }),
        );
      return send(
        '/api/v1/shares' +
          (cursor === undefined ? '' : '?' + new URLSearchParams({ cursor }).toString()),
        sharePageSchema,
      );
    },
    async load(id) {
      const parsed = z.uuid().safeParse(id);
      if (!parsed.success)
        return fail({ code: 'INVALID_SHARE_ID', message: 'O endereço desta obra é inválido.' });
      const result = await send('/api/v1/shares/' + parsed.data.toLowerCase(), shareEntrySchema);
      return result.ok && result.value.id.toLowerCase() !== parsed.data.toLowerCase()
        ? fail({
            code: 'SHARE_INVALID_RESPONSE',
            message: 'A obra recebida não corresponde ao endereço solicitado.',
          })
        : result;
    },
  };
}
