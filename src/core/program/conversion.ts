import { fail, succeed, type Result, type Span } from '../common/index.js';
import { parseLogo, resolveCommand, infixCatalog, type LogoNode } from '../logo/index.js';
import {
  createBlockId,
  type Block,
  type BlockId,
  type CommentAnchor,
  type Projection,
  type Value,
} from './index.js';
import {
  ProjectionFailure,
  programLimits,
  projectionFailure,
  readProjection,
  sameBlocks,
} from './validation.js';

/** Metadados locais usados para editar tokens e pontos de encaixe sem perder a fonte. */
export type ProjectionContext = Readonly<{
  projection: Projection;
  nodes: ReadonlyMap<BlockId, LogoNode>;
  bodies: ReadonlyMap<BlockId | null, Readonly<{ span: Span; blocks: readonly Block[] }>>;
}>;
/** Exige argumento existente sem confiar em aridade presumida. */
function argument(node: Extract<LogoNode, { kind: 'call' }>, index: number): LogoNode {
  const value = node.args[index];
  if (!value)
    throw new ProjectionFailure(
      'O comando precisa de mais informações.',
      'UNREPRESENTABLE_ARGUMENT',
      node.span,
    );
  return value;
}
/** Resolve aliases e infixos somente por dados do catálogo puro. */
function commandName(name: string): string {
  return infixCatalog[name]?.name ?? resolveCommand(name)?.name ?? name;
}
/** Projeta números, variáveis e os quatro operadores suportados integralmente. */
export function projectValue(node: LogoNode, depth = 0): Value {
  if (depth > programLimits.expressionDepth)
    throw new ProjectionFailure('Expressão aninhada demais.', 'PROJECTION_LIMIT', node.span);
  if (node.kind === 'number') return { kind: 'number', value: node.value };
  if (node.kind === 'variable') return { kind: 'variable', name: node.name };
  if (node.kind === 'call') {
    const command = commandName(node.name);
    if (
      (command === 'sum' ||
        command === 'difference' ||
        command === 'product' ||
        command === 'divide') &&
      node.args.length === 2
    )
      return {
        kind: 'operator',
        command,
        left: projectValue(argument(node, 0), depth + 1),
        right: projectValue(argument(node, 1), depth + 1),
      };
  }
  throw new ProjectionFailure(
    'Este argumento não cabe nos valores visuais; mantenha o programa no Código.',
    'UNREPRESENTABLE_ARGUMENT',
    node.span,
  );
}
/** Localiza token de nome preservando comentários, parênteses e espaços anteriores. */
export function nameSpan(source: string, node: LogoNode, definition = false): Span {
  let offset = node.span.start;
  if (definition) offset += 2;
  for (;;) {
    const char = source[offset];
    if (char === undefined || offset >= node.span.end)
      throw new ProjectionFailure('Nome não localizado na fonte.');
    if (/\s|\(/.test(char)) {
      offset++;
      continue;
    }
    if (char === ';') {
      const end = source.indexOf('\n', offset);
      offset = end < 0 ? node.span.end : end + 1;
      continue;
    }
    break;
  }
  const word = /^(?:[a-zA-Z][\w.]*|\.\w*)\??/.exec(source.slice(offset));
  if (!word) throw new ProjectionFailure('Nome não localizado na fonte.');
  return { start: offset, end: offset + word[0].length };
}
/** Constrói projeção e mapa de sintaxe com identidades fornecidas ou determinísticas. */
export function projectionContext(
  source: string,
  revision: number,
  identities?: readonly BlockId[],
): ProjectionContext {
  const parsed = parseLogo(source);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0];
    throw new ProjectionFailure(
      diagnostic?.message ?? 'Fonte LOGO inválida.',
      diagnostic?.code ?? 'LOGO_SYNTAX',
      diagnostic?.span,
    );
  }
  const nodes = new Map<BlockId, LogoNode>(),
    bodies = new Map<BlockId | null, { span: Span; blocks: readonly Block[] }>();
  let count = 0;
  /** Projeta somente instruções com equivalente integral, recusando o documento inteiro em falha. */
  function project(node: LogoNode, depth = 0, inDefinition = false): Block {
    if (depth > programLimits.depth || ++count > programLimits.blocks)
      throw new ProjectionFailure(
        'A projeção excedeu o limite de blocos ou aninhamento.',
        'PROJECTION_LIMIT',
        node.span,
      );
    const id = identities?.[count - 1] ?? createBlockId('b' + String(count));
    const identity = typeof id === 'string' ? id : id.ok ? id.value : undefined;
    if (!identity) throw new ProjectionFailure('Identidade não disponível para o bloco.');
    const meta = { id: identity, sourceSpan: node.span };
    nodes.set(identity, node);
    if (node.kind === 'define') {
      if (node.parameters.length || inDefinition)
        throw new ProjectionFailure(
          'Procedimentos com parâmetros ou definições internas permanecem no Código.',
          'UNREPRESENTABLE_PROCEDURE',
          node.span,
        );
      const body = node.body.map((child) => project(child, depth + 1, true));
      bodies.set(identity, {
        span: { start: nameSpan(source, node, true).end, end: node.span.end - 3 },
        blocks: body,
      });
      return { ...meta, kind: 'define', name: node.name, body };
    }
    if (node.kind !== 'call')
      throw new ProjectionFailure(
        'Este trecho não é uma instrução visual.',
        'UNREPRESENTABLE_STATEMENT',
        node.span,
      );
    const command = commandName(node.name);
    switch (command) {
      case 'forward':
      case 'backward':
      case 'left':
      case 'right':
      case 'setx':
      case 'sety':
        if (node.args.length !== 1) break;
        return { ...meta, kind: 'move', command, value: projectValue(argument(node, 0)) };
      case 'setxy':
        if (node.args.length !== 2) break;
        return {
          ...meta,
          kind: 'position',
          x: projectValue(argument(node, 0)),
          y: projectValue(argument(node, 1)),
        };
      case 'penup':
      case 'pendown':
      case 'reset':
        if (node.args.length !== 0) break;
        return { ...meta, kind: 'pen', command };
      case 'color': {
        const rgb = argument(node, 0);
        if (
          node.args.length !== 1 ||
          rgb.kind !== 'list' ||
          rgb.items.length !== 3 ||
          rgb.items.some(
            (item) =>
              item.kind !== 'number' ||
              !Number.isInteger(item.value) ||
              item.value < 0 ||
              item.value > 255,
          )
        )
          break;
        const [r, g, b] = rgb.items;
        if (r?.kind !== 'number' || g?.kind !== 'number' || b?.kind !== 'number') break;
        return { ...meta, kind: 'color', rgb: [r.value, g.value, b.value] };
      }
      case 'repeat': {
        const bodyNode = argument(node, 1);
        if (node.args.length !== 2 || bodyNode.kind !== 'list' || bodyNode.delimiter !== 'brackets')
          break;
        const body = bodyNode.items.map((child) => project(child, depth + 1, inDefinition));
        bodies.set(identity, {
          span: { start: bodyNode.span.start + 1, end: bodyNode.span.end - 1 },
          blocks: body,
        });
        return { ...meta, kind: 'repeat', times: projectValue(argument(node, 0)), body };
      }
      case 'make': {
        const name = argument(node, 0);
        if (node.args.length !== 2 || name.kind !== 'symbol') break;
        return { ...meta, kind: 'make', name: name.name, value: projectValue(argument(node, 1)) };
      }
      default:
        if (
          node.args.length === 0 &&
          !resolveCommand(node.name) &&
          !infixCatalog[node.name] &&
          !['true', 'false', 'stop', 'to', 'end'].includes(node.name)
        )
          return { ...meta, kind: 'call', name: node.name };
    }
    throw new ProjectionFailure(
      `O comando ou a forma de argumentos de ${node.name} não tem equivalente visual. Mantenha a fonte no Código.`,
      'UNREPRESENTABLE_COMMAND',
      node.span,
    );
  }
  const blocks = parsed.value.body.map((node) => project(node));
  if (identities && identities.length !== count)
    throw new ProjectionFailure('Quantidade de identidades difere da fonte.', 'STALE_PROJECTION');
  bodies.set(null, { span: { start: 0, end: source.length }, blocks });
  const ownership = new Map<number, { blockId: BlockId; placement: CommentAnchor['placement'] }>();
  for (const [parentId, body] of bodies) {
    const comments = parsed.value.comments.filter(
      (comment) =>
        comment.span.start >= body.span.start &&
        comment.span.end <= body.span.end &&
        !body.blocks.some(
          (block) =>
            block.sourceSpan &&
            comment.span.start >= block.sourceSpan.start &&
            comment.span.end <= block.sourceSpan.end,
        ),
    );
    for (const comment of comments) {
      const previous = body.blocks.findLast(
        (block) => (block.sourceSpan?.end ?? Infinity) <= comment.span.start,
      );
      if (
        previous?.sourceSpan &&
        /^[\t ]*$/.test(source.slice(previous.sourceSpan.end, comment.span.start))
      )
        ownership.set(comment.span.start, { blockId: previous.id, placement: 'trailing' });
      else if (
        parentId !== null &&
        (!ownership.has(comment.span.start) ||
          ownership.get(comment.span.start)?.placement === 'program')
      )
        ownership.set(comment.span.start, { blockId: parentId, placement: 'program' });
    }
    for (const block of body.blocks) {
      let cursor = block.sourceSpan?.start ?? 0;
      for (const comment of comments.toReversed()) {
        if (comment.span.end > cursor) continue;
        if (
          /^[\t ]*\r?\n[\t ]*$/.test(source.slice(comment.span.end, cursor)) &&
          (!ownership.has(comment.span.start) ||
            ownership.get(comment.span.start)?.placement === 'program')
        ) {
          ownership.set(comment.span.start, { blockId: block.id, placement: 'leading' });
          cursor = comment.span.start;
        } else break;
      }
    }
  }
  const comments: CommentAnchor[] = parsed.value.comments.map((comment) => {
    const owned = ownership.get(comment.span.start);
    if (owned) return { ...comment, ...owned };
    const container = [...nodes]
      .filter(
        ([, node]) => comment.span.start >= node.span.start && comment.span.end <= node.span.end,
      )
      .sort((a, b) => a[1].span.end - a[1].span.start - (b[1].span.end - b[1].span.start))[0];
    return container
      ? { ...comment, placement: 'trailing', blockId: container[0] }
      : { ...comment, placement: 'program' };
  });
  return {
    projection: { sourceRevision: revision, originalSource: source, blocks, comments },
    nodes,
    bodies,
  };
}
/** Obtém IDs em ordem de projeção, com limites já validados na fronteira. */
export function blockIdentities(blocks: readonly Block[]): BlockId[] {
  return blocks.flatMap((block) => [
    block.id,
    ...(block.kind === 'repeat' || block.kind === 'define' ? blockIdentities(block.body) : []),
  ]);
}
/** Reconstrói spans e confronta árvore/comentários à fonte antes de editar ou serializar. */
export function checkedContext(input: unknown): ProjectionContext {
  const projection = readProjection(input),
    context = projectionContext(
      projection.originalSource,
      projection.sourceRevision,
      blockIdentities(projection.blocks),
    );
  if (
    !sameBlocks(projection.blocks, context.projection.blocks) ||
    JSON.stringify(
      projection.comments.map((comment) => [
        comment.text,
        comment.span.start,
        comment.span.end,
        comment.placement,
        comment.blockId,
      ]),
    ) !==
      JSON.stringify(
        context.projection.comments.map((comment) => [
          comment.text,
          comment.span.start,
          comment.span.end,
          comment.placement,
          comment.blockId,
        ]),
      )
  )
    throw new ProjectionFailure(
      'Esta projeção não corresponde mais à fonte. Reabra o modo Blocos.',
      'STALE_PROJECTION',
    );
  return context;
}
/** Converte somente programas integralmente representáveis, sem executar LOGO. */
export function sourceToBlocks(source: string, revision: number): Result<Projection> {
  try {
    if (
      typeof source !== 'string' ||
      source.length > 20480 ||
      typeof revision !== 'number' ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      revision > Number.MAX_SAFE_INTEGER
    )
      return fail({ code: 'INVALID_PROJECTION', message: 'Fonte ou revisão inválida.' });
    return succeed(projectionContext(source, revision).projection);
  } catch (error) {
    return projectionFailure(error);
  }
}
/** Sem edição, retorna exatamente os caracteres recebidos, incluindo comentários e CRLF. */
export function blocksToSource(projection: Projection): Result<string> {
  try {
    return succeed(checkedContext(projection).projection.originalSource);
  } catch (error) {
    return projectionFailure(error);
  }
}
