import { isIP } from 'node:net';
import { succeed } from '../core/common/index.js';
import type { Result } from '../core/common/index.js';
import { createShareSchema, LIMITS, programDocumentSchema } from '../shared/index.js';
import type { ShareEntry } from '../shared/index.js';
import { serverFailure } from './errors.js';
import { sanitizePng } from './png.js';
import type { ShareRepository } from './repository.js';

/** Reconhece objetos JSON sem coerção de tipos ou acesso a protótipos externos. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Seleciona IP pelo socket; headers só valem para proxy local explicitamente confiável. */
export function clientAddress(
  peer: string,
  forwarded: string | undefined,
  trustLocalProxy: boolean,
): Result<string> {
  const address = peer.startsWith('::ffff:') ? peer.slice(7) : peer;
  if (!isIP(address))
    return serverFailure('INVALID_PEER', 'Não foi possível identificar a conexão.');
  if (!trustLocalProxy || !['127.0.0.1', '::1'].includes(address) || forwarded === undefined)
    return succeed(address);
  // Caddy deve SOBRESCREVER o header com um endereço; cadeias são rejeitadas.
  const proxyAddress = forwarded.trim();
  if (!isIP(proxyAddress))
    return serverFailure('INVALID_PROXY', 'O endereço informado pelo proxy é inválido.');
  return succeed(proxyAddress.startsWith('::ffff:') ? proxyAddress.slice(7) : proxyAddress);
}

/** Janela fixa de 5 criações/minuto/IP; mapa limitado e expirado sob demanda. */
export class WriteRateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  /** Conta também tentativas inválidas e recusa novos IPs quando o mapa estiver cheio. */
  consume(address: string, now = Date.now()): Result<void> {
    for (const [key, window] of this.windows) {
      if (now - window.start >= 60_000) this.windows.delete(key);
    }
    const current = this.windows.get(address);
    if (current && current.count >= 5)
      return serverFailure('RATE_LIMITED', 'Aguarde um minuto antes de compartilhar novamente.');
    if (!current && this.windows.size >= 10_000)
      return serverFailure('RATE_LIMITED', 'Há muitas solicitações. Tente novamente em um minuto.');
    this.windows.set(address, { start: current?.start ?? now, count: (current?.count ?? 0) + 1 });
    return succeed(undefined);
  }
}

/** Validação/coordenacão da criação; não executa LOGO nem carrega URLs fornecidas. */
export class ShareService {
  private active = 0;

  /** Injeta somente a persistência; processamento PNG é compartilhado por instância. */
  constructor(private readonly repository: ShareRepository) {}

  /** Reserva um dos dois trabalhos de imagem, sem criar fila ilimitada. */
  reserve(): Result<() => void> {
    if (this.active >= 2)
      return serverFailure(
        'IMAGE_BUSY',
        'Duas imagens já estão sendo processadas. Tente novamente em instantes.',
      );
    this.active += 1;
    let released = false;
    return succeed(() => {
      if (!released) {
        this.active -= 1;
        released = true;
      }
    });
  }

  /** Recebe JSON inerte, valida limites antes do decode e salva somente PNG reencodado. */
  async create(payload: unknown): Promise<Result<ShareEntry>> {
    if (!isRecord(payload))
      return serverFailure('INVALID_REQUEST', 'O corpo deve ser um objeto JSON.');
    const program = payload.program;
    if (
      isRecord(program) &&
      typeof program.source === 'string' &&
      Buffer.byteLength(program.source, 'utf8') > LIMITS.sourceBytes
    ) {
      return serverFailure('TOO_LARGE', 'O programa deve ter no máximo 20 KiB em UTF-8.');
    }
    if (
      typeof payload.pngBase64 === 'string' &&
      payload.pngBase64.length > Math.ceil(LIMITS.pngBytes / 3) * 4
    ) {
      return serverFailure('TOO_LARGE', 'A imagem deve ter no máximo 2 MiB.');
    }
    if (!programDocumentSchema.safeParse(program).success)
      return serverFailure(
        'INVALID_DOCUMENT',
        'O documento, sua versão ou seu personagem são inválidos.',
      );
    const validated = createShareSchema.safeParse(payload);
    if (!validated.success)
      return serverFailure(
        'INVALID_REQUEST',
        'Os campos do compartilhamento ou a codificação da imagem são inválidos.',
      );
    const png = await sanitizePng(validated.data.pngBase64);
    if (!png.ok) return png;
    return this.repository.create(validated.data.program, png.value);
  }
}
