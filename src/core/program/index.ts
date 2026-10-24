import { fail, succeed } from '../common/index.js';
import type { Result, RGB, Span } from '../common/index.js';

declare const blockBrand: unique symbol;

/** Identidade opaca validada pela fábrica central; não é um formato persistido. */
export type BlockId = string & { readonly [blockBrand]: true };

/**
 * Valida uma identidade escolhida pelo chamador, sem gerar aleatoriedade no core.
 * Aceita 1–128 caracteres ASCII alfanuméricos, hífen ou sublinhado; o primeiro
 * deve ser alfanumérico. Não normaliza o texto para evitar colisões silenciosas.
 * Unicidade e vínculo à árvore são invariantes da edição, não desta fábrica.
 */
export function createBlockId(value: unknown): Result<BlockId> {
  if (
    typeof value !== 'string' ||
    value.length > 128 ||
    !/^[A-Za-z0-9]/.test(value) ||
    /[^A-Za-z0-9_-]/.test(value)
  ) {
    return fail({
      code: 'INVALID_BLOCK_ID',
      message:
        'O identificador do bloco deve ter de 1 a 128 letras, números, hífens ou sublinhados e começar com letra ou número.',
    });
  }

  // A marca só é aplicada nesta fronteira, depois de validar o conteúdo completo.
  return succeed(value as BlockId);
}

/** Valor imutável de um slot; expressões não são instruções de programa. */
export type Value =
  | Readonly<{ kind: 'number'; value: number }>
  | Readonly<{ kind: 'variable'; name: string }>
  | Readonly<{
      kind: 'operator';
      command: 'sum' | 'difference' | 'product' | 'divide';
      left: Value;
      right: Value;
    }>;

/** Identidade do bloco e sua localização opcional na fonte projetada. */
export type BlockMeta = Readonly<{ id: BlockId; sourceSpan?: Span }>;

/** Subconjunto integralmente representável da paleta visual aprovada. */
export type Block = BlockMeta &
  (
    | Readonly<{
        kind: 'move';
        command: 'forward' | 'backward' | 'left' | 'right' | 'setx' | 'sety';
        value: Value;
      }>
    | Readonly<{ kind: 'position'; x: Value; y: Value }>
    | Readonly<{ kind: 'pen'; command: 'penup' | 'pendown' | 'reset' }>
    | Readonly<{ kind: 'color'; rgb: RGB }>
    | Readonly<{ kind: 'repeat'; times: Value; body: readonly Block[] }>
    | Readonly<{ kind: 'define'; name: string; body: readonly Block[] }>
    | Readonly<{ kind: 'call'; name: string }>
    | Readonly<{ kind: 'make'; name: string; value: Value }>
  );

/** Comentário conservado na projeção, associado a um bloco ou ao programa. */
export type CommentAnchor = Readonly<{
  text: string;
  span: Span;
  placement: 'leading' | 'trailing' | 'program';
  blockId?: BlockId;
}>;

/** Projeção vinculada a uma revisão; a fonte original continua canônica. */
export type Projection = Readonly<{
  sourceRevision: number;
  originalSource: string;
  blocks: readonly Block[];
  comments: readonly CommentAnchor[];
}>;

/** Índice de inserção em um corpo; parentId nulo indica a raiz do programa. */
/** Encaixe na árvore anterior à edição; mover no mesmo corpo ajusta índice após remoção. */
export type BodyTarget = Readonly<{ parentId: BlockId | null; index: number }>;

/** Edição atômica; replace deve conservar a identidade do alvo. */
export type BlockAction =
  | Readonly<{ type: 'insert'; block: Block; target: BodyTarget }>
  | Readonly<{ type: 'move'; id: BlockId; target: BodyTarget }>
  | Readonly<{ type: 'remove'; id: BlockId }>
  | Readonly<{ type: 'replace'; id: BlockId; block: Block }>;

/** Porta pura da conversão integral; fonte e comentários são preservados ou a operação falha. */
export interface ConversionService {
  /** Analisa sem executar; falha se qualquer trecho não puder ser representado. */
  sourceToBlocks(source: string, revision: number): Result<Projection>;
  /** Valida e aplica a edição sem mutar a projeção; conserva comentários ou falha. */
  editBlocks(projection: Projection, action: BlockAction): Result<Projection>;
  /** Retorna a fonte exata sem edição; preserva os comentários quando editada. */
  blocksToSource(projection: Projection): Result<string>;
}

export { sourceToBlocks, blocksToSource } from './conversion.js';
export { editBlocks } from './editing.js';
