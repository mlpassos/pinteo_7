import { LIMITS } from '../shared/index.js';

/** Busca somente PNG local limitado; nunca executa a fonte para recuperar a imagem. */
export async function loadPreview(url: string): Promise<Blob> {
  if (!/^\/api\/v1\/shares\/[0-9a-f-]{36}\/preview\.png$/i.test(url))
    throw new Error('Prévia inválida.');
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      headers: { Accept: 'image/png' },
    });
    if (
      !response.ok ||
      response.headers.get('content-type')?.split(';')[0]?.trim() !== 'image/png' ||
      !response.body
    )
      throw new Error('Não foi possível carregar a prévia. Seu rascunho foi preservado.');
    const declared = response.headers.get('content-length');
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > LIMITS.pngBytes)) {
      await response.body.cancel();
      throw new Error('A prévia ultrapassa o limite de imagem.');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > LIMITS.pngBytes) {
          await reader.cancel();
          throw new Error('A prévia ultrapassa o limite de imagem.');
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (size < 24 || signature.some((byte, index) => bytes[index] !== byte))
      throw new Error('A prévia não é um PNG válido.');
    const header = new DataView(bytes.buffer);
    const width = header.getUint32(16),
      height = header.getUint32(20);
    if (!width || !height || width > LIMITS.pngDimension || height > LIMITS.pngDimension)
      throw new Error('A prévia tem dimensões inválidas.');
    const blob = new Blob([bytes], { type: 'image/png' });
    const image = await createImageBitmap(blob);
    try {
      if (image.width !== width || image.height !== height)
        throw new Error('A prévia tem dimensões inválidas.');
    } finally {
      image.close();
    }
    return blob;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
