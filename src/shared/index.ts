import { z } from 'zod';
import { CHARACTER_IDS } from './characters.js';

export { CHARACTER_IDS } from './characters.js';

/** Limites comuns; o servidor também limita o corpo antes de decodificar JSON. */
export const LIMITS = Object.freeze({
  sourceBytes: 20 * 1024,
  requestBytes: 3 * 1024 * 1024,
  pngBytes: 2 * 1024 * 1024,
  pngDimension: 2048,
  pageSize: 20,
  maxPageSize: 50,
  cursorLength: 256,
});

/** Documento canônico persistido: nunca contém HTML ou cache de blocos. */
export const programDocumentSchema = z.strictObject({
  formatVersion: z.literal(1),
  source: z
    .string()
    .refine((source) => new TextEncoder().encode(source).byteLength <= LIMITS.sourceBytes, {
      message: 'O programa deve ter no máximo 20 KiB em UTF-8.',
    }),
  characterId: z.enum(CHARACTER_IDS),
});

/** Fonte pode ser um rascunho sintaticamente inválido; não é executada ao validar. */
export type ProgramDocument = Readonly<z.infer<typeof programDocumentSchema>>;

/** Resumo público sem fonte ou caminho físico do armazenamento. */
export const shareSummarySchema = z
  .strictObject({
    id: z.uuid(),
    createdAt: z.iso.datetime({ offset: true }),
    previewUrl: z
      .string()
      .max(128)
      .regex(/^\/api\/v1\/shares\/[0-9a-f-]{36}\/preview\.png$/i),
  })
  .superRefine((summary, context) => {
    if (summary.previewUrl !== `/api/v1/shares/${summary.id}/preview.png`) {
      context.addIssue({
        code: 'custom',
        path: ['previewUrl'],
        message: 'A prévia deve corresponder ao identificador da obra.',
      });
    }
  });

/** Resumo validado de uma obra compartilhada. */
export type ShareSummary = Readonly<z.infer<typeof shareSummarySchema>>;

/** Obra validada recebida do servidor; código e personagem continuam dados. */
export const shareEntrySchema = z
  .strictObject({
    ...shareSummarySchema.shape,
    program: programDocumentSchema,
  })
  .superRefine((entry, context) => {
    if (entry.previewUrl !== `/api/v1/shares/${entry.id}/preview.png`) {
      context.addIssue({
        code: 'custom',
        path: ['previewUrl'],
        message: 'A prévia deve corresponder ao identificador da obra.',
      });
    }
  });

/** Recurso público imutável; sem informações privadas do servidor. */
export type ShareEntry = Readonly<z.infer<typeof shareEntrySchema>>;

/** Página finita com cursor opaco; não são aceitas propriedades desconhecidas. */
export const sharePageSchema = z.strictObject({
  items: z.array(shareSummarySchema).max(LIMITS.maxPageSize),
  nextCursor: z.string().min(1).max(LIMITS.cursorLength).nullable(),
});

/** Página validada da galeria pública. */
export type SharePage = Readonly<{
  items: readonly ShareSummary[];
  nextCursor: string | null;
}>;

/** Validação estrutural inicial; assinatura/dimensões/reencode do PNG cabem à API. */
export const createShareSchema = z.strictObject({
  program: programDocumentSchema,
  pngBase64: z
    .string()
    .min(4)
    .max(Math.ceil(LIMITS.pngBytes / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});

/** Corpo da criação de um compartilhado, após validação estrutural. */
export type CreateShareRequest = Readonly<z.infer<typeof createShareSchema>>;

/** Erro HTTP público com campos limitados, sem stack ou dados de infraestrutura. */
export const apiErrorSchema = z.strictObject({
  error: z.strictObject({ code: z.string().min(1).max(80), message: z.string().min(1).max(500) }),
});

/** Envelope JSON das falhas HTTP esperadas. */
export type ApiError = Readonly<z.infer<typeof apiErrorSchema>>;
