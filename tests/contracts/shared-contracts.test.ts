import { describe, expect, it } from 'vitest';
import {
  CHARACTER_IDS,
  LIMITS,
  createShareSchema,
  programDocumentSchema,
  shareEntrySchema,
  sharePageSchema,
  shareSummarySchema,
} from '../../src/shared/index.js';

const document = {
  formatVersion: 1,
  source: '; comentário\nforward random 100',
  characterId: 'tartaruga',
};
const id = 'fa5774ab-7d19-4afd-aead-598c3f63b730';
const summary = {
  id,
  createdAt: '2026-10-23T12:00:00Z',
  previewUrl: `/api/v1/shares/${id}/preview.png`,
};

describe('fronteira do documento canônico', () => {
  it('aceita rascunho LOGO sem executá-lo ou normalizar comentários', () => {
    expect(programDocumentSchema.parse(document)).toEqual(document);
    expect(programDocumentSchema.parse({ ...document, source: 'repeat [' }).source).toBe(
      'repeat [',
    );
  });
  it('rejeita campos HTML/blocos, formatos e personagens desconhecidos', () => {
    for (const invalid of [
      { ...document, html: '<script>alert(1)</script>' },
      { ...document, blocks: [] },
      { ...document, formatVersion: 2 },
      { ...document, characterId: '../../segredo' },
      { ...document, source: 123 },
    ])
      expect(programDocumentSchema.safeParse(invalid).success).toBe(false);
    expect(CHARACTER_IDS).toHaveLength(21);
  });
  it('aplica o limite em bytes UTF-8, inclusive a caracteres multibyte', () => {
    expect(
      programDocumentSchema.safeParse({ ...document, source: 'a'.repeat(LIMITS.sourceBytes) })
        .success,
    ).toBe(true);
    expect(
      programDocumentSchema.safeParse({ ...document, source: 'a'.repeat(LIMITS.sourceBytes + 1) })
        .success,
    ).toBe(false);
    expect(
      programDocumentSchema.safeParse({
        ...document,
        source: 'á'.repeat(LIMITS.sourceBytes / 2 + 1),
      }).success,
    ).toBe(false);
  });
});

describe('contratos públicos de compartilhamento', () => {
  it('aceita envelopes estritos e prévia local vinculada ao mesmo UUID', () => {
    expect(shareSummarySchema.parse(summary)).toEqual(summary);
    expect(shareEntrySchema.parse({ ...summary, program: document }).program).toEqual(document);
    expect(sharePageSchema.parse({ items: [summary], nextCursor: null }).items).toHaveLength(1);
  });
  it('não permite URLs externas, prévias de outro UUID ou metadados internos', () => {
    for (const data of [
      { ...summary, previewUrl: 'https://outro.test/imagem.png' },
      { ...summary, previewUrl: '/api/v1/shares/ea5774ab-7d19-4afd-aead-598c3f63b730/preview.png' },
      { ...summary, path: '/var/dados/obra' },
      { ...summary, id: '../etc/passwd' },
    ])
      expect(shareSummarySchema.safeParse(data).success).toBe(false);
    expect(
      shareEntrySchema.safeParse({ ...summary, program: document, previewUrl: '/outro.png' })
        .success,
    ).toBe(false);
  });
  it('limita paginação e o envelope PNG sem prometer validar sua imagem aqui', () => {
    expect(
      sharePageSchema.safeParse({
        items: Array.from({ length: 51 }, () => summary),
        nextCursor: null,
      }).success,
    ).toBe(false);
    expect(createShareSchema.safeParse({ program: document, pngBase64: 'aGVsbG8=' }).success).toBe(
      true,
    );
    expect(
      createShareSchema.safeParse({ program: document, pngBase64: '<img src=x>' }).success,
    ).toBe(false);
    expect(
      createShareSchema.safeParse({
        program: document,
        pngBase64: 'A'.repeat(Math.ceil(LIMITS.pngBytes / 3) * 4 + 4),
      }).success,
    ).toBe(false);
  });
});
