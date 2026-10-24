import type { Result } from '../core/common/index.js';

/** Falha pública estável; nunca inclui a mensagem de uma exceção do sistema. */
export function serverFailure(
  code: string,
  message: string,
): Extract<Result<never>, { ok: false }> {
  return { ok: false, diagnostics: [{ code, message }] };
}

/** Converte códigos internos conhecidos em respostas do contrato HTTP. */
export function errorStatus(code: string): 400 | 404 | 413 | 415 | 422 | 429 | 500 | 503 {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'TOO_LARGE':
      return 413;
    case 'UNSUPPORTED_MEDIA':
      return 415;
    case 'INVALID_DOCUMENT':
    case 'INVALID_PNG':
      return 422;
    case 'RATE_LIMITED':
      return 429;
    case 'QUOTA_EXCEEDED':
    case 'IMAGE_BUSY':
    case 'STORAGE_UNAVAILABLE':
    case 'STORAGE_BUSY':
    case 'STORAGE_CORRUPT':
      return 503;
    case 'UNEXPECTED':
      return 500;
    default:
      return 400;
  }
}

/** Reconhece códigos de IO sem confiar no tipo da exceção recebida. */
export function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
