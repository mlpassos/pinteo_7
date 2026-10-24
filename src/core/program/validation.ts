import { fail, type Result, type Span } from '../common/index.js';
import {
  createBlockId,
  type Block,
  type BlockId,
  type Projection,
  type Value,
  type CommentAnchor,
} from './index.js';

/** Tetos de projeção/edição, abaixo dos limites sintáticos do parser. */
export const programLimits = { blocks: 2000, depth: 64, expressionDepth: 32 } as const;
/** Erro de dado externo, convertido em diagnóstico nas três fronteiras públicas. */
export class ProjectionFailure extends Error {
  /** Retém código e posição quando a origem textual está disponível. */
  constructor(
    message: string,
    readonly code = 'INVALID_PROJECTION',
    readonly span?: Span,
  ) {
    super(message);
  }
}
/** Converte falha esperada em Result, sem capturar silenciosamente bugs internos. */
export function projectionFailure(error: unknown): Result<never> {
  if (error instanceof ProjectionFailure)
    return fail({
      code: error.code,
      message: error.message,
      ...(error.span ? { span: error.span } : {}),
    });
  throw error;
}
/** Exige objeto simples antes de ler dados estruturados. */
export function object(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new ProjectionFailure('Era esperado um objeto de programa.');
  return input as Record<string, unknown>;
}
/** Exige lista limitada antes de qualquer percurso recursivo. */
function array(input: unknown, limit: number = programLimits.blocks): readonly unknown[] {
  if (!Array.isArray(input) || input.length > limit)
    throw new ProjectionFailure('Lista de blocos inválida ou excessiva.');
  return input;
}
/** Valida identificador pela única fábrica que aplica a marca opaca. */
export function blockId(input: unknown): BlockId {
  const id = createBlockId(input);
  if (!id.ok) throw new ProjectionFailure('Identificador de bloco inválido.', 'INVALID_BLOCK_ID');
  return id.value;
}
/** Normaliza nomes LOGO sem aceitar caracteres de sintaxe injetados em campos. */
function logoName(input: unknown, procedure = false): string {
  if (
    typeof input !== 'string' ||
    input.length > 128 ||
    !(procedure ? /^(?:[a-zA-Z][\w.]*|\.\w*)\??$/ : /^[a-zA-Z]\w*$/).test(input)
  )
    throw new ProjectionFailure('Nome LOGO inválido.', 'INVALID_LOGO_NAME');
  return input.toLowerCase();
}
/** Valida número finito antes de incorporá-lo à projeção. */
function finite(input: unknown): number {
  if (typeof input !== 'number' || !Number.isFinite(input))
    throw new ProjectionFailure('O valor precisa ser um número finito.');
  return input;
}
/** Valida offsets sem aceitar valores negativos ou invertidos. */
function span(input: unknown): Span {
  const entry = object(input),
    start = finite(entry.start),
    end = finite(entry.end);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start)
    throw new ProjectionFailure('Intervalo da fonte inválido.');
  return { start, end };
}
/** Reconstrói expressão imutável, recusando ciclos e profundidade excessiva. */
function readValue(
  input: unknown,
  depth = 0,
  ancestors = new Set<object>(),
  budget = { count: 0 },
): Value {
  if (depth > programLimits.expressionDepth || ++budget.count > 20000)
    throw new ProjectionFailure('Expressão aninhada demais.', 'PROJECTION_LIMIT');
  const entry = object(input);
  if (ancestors.has(entry)) throw new ProjectionFailure('A expressão contém um ciclo.');
  ancestors.add(entry);
  let value: Value;
  switch (entry.kind) {
    case 'number':
      value = { kind: 'number', value: finite(entry.value) };
      break;
    case 'variable':
      value = { kind: 'variable', name: logoName(entry.name) };
      break;
    case 'operator': {
      const command = entry.command;
      if (
        command !== 'sum' &&
        command !== 'difference' &&
        command !== 'product' &&
        command !== 'divide'
      )
        throw new ProjectionFailure('Operador visual inválido.');
      value = {
        kind: 'operator',
        command,
        left: readValue(entry.left, depth + 1, ancestors, budget),
        right: readValue(entry.right, depth + 1, ancestors, budget),
      };
      break;
    }
    default:
      throw new ProjectionFailure('Espécie de valor visual inválida.');
  }
  ancestors.delete(entry);
  return value;
}
/** Reconstrói árvore validada sem compartilhar referências mutáveis recebidas. */
export function readBlocks(input: unknown): readonly Block[] {
  const ids = new Set<BlockId>(),
    ancestors = new Set<object>();
  let count = 0;
  const budget = { count: 0 };
  const value = (input: unknown): Value => readValue(input, 0, new Set(), budget);
  /** Valida cada bloco e seus corpos no mesmo orçamento global da árvore. */
  function read(input: unknown, depth: number, inDefinition: boolean): Block {
    if (depth > programLimits.depth || ++count > programLimits.blocks)
      throw new ProjectionFailure(
        'A árvore excedeu o limite de blocos ou aninhamento.',
        'PROJECTION_LIMIT',
      );
    const entry = object(input);
    if (ancestors.has(entry)) throw new ProjectionFailure('A árvore contém um ciclo.');
    ancestors.add(entry);
    const id = blockId(entry.id);
    if (ids.has(id))
      throw new ProjectionFailure(
        'Um bloco aparece mais de uma vez na árvore.',
        'DUPLICATE_BLOCK_ID',
      );
    ids.add(id);
    const meta = {
      id,
      ...(entry.sourceSpan === undefined ? {} : { sourceSpan: span(entry.sourceSpan) }),
    };
    let block: Block;
    switch (entry.kind) {
      case 'move': {
        const command = entry.command;
        if (
          command !== 'forward' &&
          command !== 'backward' &&
          command !== 'left' &&
          command !== 'right' &&
          command !== 'setx' &&
          command !== 'sety'
        )
          throw new ProjectionFailure('Movimento visual inválido.');
        block = { ...meta, kind: 'move', command, value: value(entry.value) };
        break;
      }
      case 'position':
        block = { ...meta, kind: 'position', x: value(entry.x), y: value(entry.y) };
        break;
      case 'pen': {
        const command = entry.command;
        if (command !== 'penup' && command !== 'pendown' && command !== 'reset')
          throw new ProjectionFailure('Comando de pena inválido.');
        block = { ...meta, kind: 'pen', command };
        break;
      }
      case 'color': {
        const rgb = array(entry.rgb);
        if (rgb.length !== 3) throw new ProjectionFailure('A cor precisa de três componentes.');
        const r = finite(rgb[0]),
          g = finite(rgb[1]),
          b = finite(rgb[2]);
        if ([r, g, b].some((value) => !Number.isInteger(value) || value < 0 || value > 255))
          throw new ProjectionFailure('A cor precisa de inteiros entre 0 e 255.');
        block = { ...meta, kind: 'color', rgb: [r, g, b] };
        break;
      }
      case 'repeat':
        block = {
          ...meta,
          kind: 'repeat',
          times: value(entry.times),
          body: array(entry.body).map((child) => read(child, depth + 1, inDefinition)),
        };
        break;
      case 'define':
        if (inDefinition)
          throw new ProjectionFailure(
            'Não é permitido definir procedimento dentro de outro.',
            'NESTED_PROCEDURE',
          );
        block = {
          ...meta,
          kind: 'define',
          name: logoName(entry.name, true),
          body: array(entry.body).map((child) => read(child, depth + 1, true)),
        };
        break;
      case 'call':
        block = { ...meta, kind: 'call', name: logoName(entry.name, true) };
        break;
      case 'make':
        block = {
          ...meta,
          kind: 'make',
          name: logoName(entry.name),
          value: value(entry.value),
        };
        break;
      default:
        throw new ProjectionFailure('Espécie de bloco visual inválida.');
    }
    ancestors.delete(entry);
    return block;
  }
  return array(input).map((block) => read(block, 0, false));
}
/** Valida o envelope recebido sem confiar em casts do chamador TypeScript. */
export function readProjection(input: unknown): Projection {
  const entry = object(input);
  if (
    typeof entry.originalSource !== 'string' ||
    entry.originalSource.length > 20480 ||
    !Number.isSafeInteger(entry.sourceRevision) ||
    typeof entry.sourceRevision !== 'number' ||
    entry.sourceRevision < 0 ||
    entry.sourceRevision > Number.MAX_SAFE_INTEGER
  )
    throw new ProjectionFailure('Fonte ou revisão da projeção inválida.');
  const sourceLength = entry.originalSource.length;
  let commentLength = 0;
  const comments = array(entry.comments, 20480).map((raw): CommentAnchor => {
    const comment = object(raw);
    if (
      typeof comment.text !== 'string' ||
      comment.text.length > 20480 ||
      (comment.placement !== 'leading' &&
        comment.placement !== 'trailing' &&
        comment.placement !== 'program')
    )
      throw new ProjectionFailure('Comentário de projeção inválido.');
    commentLength += comment.text.length;
    if (commentLength > sourceLength)
      throw new ProjectionFailure('Comentários excedem o tamanho da fonte.', 'STALE_PROJECTION');
    return {
      text: comment.text,
      placement: comment.placement,
      span: span(comment.span),
      ...(comment.blockId === undefined ? {} : { blockId: blockId(comment.blockId) }),
    };
  });
  return {
    sourceRevision: entry.sourceRevision,
    originalSource: entry.originalSource,
    blocks: readBlocks(entry.blocks),
    comments,
  };
}
/** Retira metadados voláteis para confrontar semântica e identidades da árvore. */
function blockShape(block: Block, identity = true): unknown {
  const meta = identity ? { id: block.id } : {};
  switch (block.kind) {
    case 'repeat':
      return {
        ...meta,
        kind: block.kind,
        times: block.times,
        body: block.body.map((child) => blockShape(child, identity)),
      };
    case 'define':
      return {
        ...meta,
        kind: block.kind,
        name: block.name,
        body: block.body.map((child) => blockShape(child, identity)),
      };
    case 'move':
      return { ...meta, kind: block.kind, command: block.command, value: block.value };
    case 'position':
      return { ...meta, kind: block.kind, x: block.x, y: block.y };
    case 'pen':
      return { ...meta, kind: block.kind, command: block.command };
    case 'color':
      return { ...meta, kind: block.kind, rgb: block.rgb };
    case 'make':
      return { ...meta, kind: block.kind, name: block.name, value: block.value };
    case 'call':
      return { ...meta, kind: block.kind, name: block.name };
  }
}
/** Compara estruturas já validadas, sem percorrer objetos arbitrários do chamador. */
export function sameBlocks(
  left: readonly Block[],
  right: readonly Block[],
  identity = true,
): boolean {
  return (
    JSON.stringify(
      left.map((block) => blockShape(block, identity)),
      numberIdentity,
    ) ===
    JSON.stringify(
      right.map((block) => blockShape(block, identity)),
      numberIdentity,
    )
  );
}

/** Distingue zero negativo em estruturas já validadas, sem coerção de valores externos. */
function numberIdentity(_key: string, value: unknown): unknown {
  return typeof value === 'number' && Object.is(value, -0) ? 'number:-0' : value;
}
