import sharp from 'sharp';
import { LIMITS } from '../shared/index.js';
import { succeed } from '../core/common/index.js';
import type { Result } from '../core/common/index.js';
import { serverFailure } from './errors.js';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Valida assinatura, dimensões e pixels, e elimina metadados reencodando PNG. */
export async function sanitizePng(base64: string): Promise<Result<Buffer>> {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > LIMITS.pngBytes)
    return serverFailure('TOO_LARGE', 'A imagem deve ter no máximo 2 MiB.');
  if (bytes.toString('base64') !== base64 || !bytes.subarray(0, 8).equals(signature)) {
    return serverFailure('INVALID_PNG', 'Envie uma imagem PNG válida.');
  }
  try {
    const image = sharp(bytes, { limitInputPixels: LIMITS.pngDimension ** 2, failOn: 'warning' });
    const metadata = await image.metadata();
    if (
      metadata.format !== 'png' ||
      metadata.width > LIMITS.pngDimension ||
      metadata.height > LIMITS.pngDimension ||
      (metadata.pages ?? 1) !== 1
    ) {
      return serverFailure('INVALID_PNG', 'O PNG deve ser estático e ter até 2048 × 2048 pixels.');
    }
    const clean = await image.png({ compressionLevel: 9 }).toBuffer();
    if (clean.length > LIMITS.pngBytes)
      return serverFailure('TOO_LARGE', 'A imagem reencodada deve ter no máximo 2 MiB.');
    return succeed(clean);
  } catch {
    return serverFailure('INVALID_PNG', 'Não foi possível validar os pixels da imagem PNG.');
  }
}
