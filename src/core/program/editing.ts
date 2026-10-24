import { succeed, type Result, type Span } from '../common/index.js';
import { infixCatalog, type LogoNode } from '../logo/index.js';
import type { Block, BlockAction, BlockId, BodyTarget, Projection, Value } from './index.js';
import {
  blockIdentities,
  checkedContext,
  nameSpan,
  projectValue,
  projectionContext,
  type ProjectionContext,
} from './conversion.js';
import {
  blockId,
  object,
  projectionFailure,
  ProjectionFailure,
  readBlocks,
  sameBlocks,
} from './validation.js';
import { blockSource, valueSource } from './source.js';

type Patch = Readonly<{ span: Span; text: string }>;
/** Exige posição de encaixe em árvore anterior à remoção. */
function readTarget(input: unknown): BodyTarget {
  const target = object(input);
  if (typeof target.index !== 'number' || !Number.isSafeInteger(target.index) || target.index < 0)
    throw new ProjectionFailure('Índice de encaixe inválido.');
  return {
    parentId: target.parentId === null ? null : blockId(target.parentId),
    index: target.index,
  };
}
/** Valida a ação inteira antes de construir uma nova árvore. */
function readAction(input: unknown): BlockAction {
  const action = object(input);
  switch (action.type) {
    case 'insert': {
      const block = readBlocks([action.block])[0];
      if (!block) throw new ProjectionFailure('Bloco ausente.');
      return { type: 'insert', block, target: readTarget(action.target) };
    }
    case 'replace': {
      const block = readBlocks([action.block])[0];
      if (!block) throw new ProjectionFailure('Bloco ausente.');
      const id = blockId(action.id);
      if (block.id !== id)
        throw new ProjectionFailure(
          'Substituir um bloco deve conservar seu identificador.',
          'REPLACE_ID_MISMATCH',
        );
      return { type: 'replace', id, block };
    }
    case 'move':
      return { type: 'move', id: blockId(action.id), target: readTarget(action.target) };
    case 'remove':
      return { type: 'remove', id: blockId(action.id) };
    default:
      throw new ProjectionFailure('Ação visual inválida.');
  }
}
/** Localiza bloco e seu corpo pai sem modificar referências recebidas. */
function locate(
  blocks: readonly Block[],
  id: BlockId,
  parentId: BlockId | null = null,
): { block: Block; parentId: BlockId | null; index: number } | undefined {
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (!block) continue;
    if (block.id === id) return { block, parentId, index };
    if (block.kind === 'repeat' || block.kind === 'define') {
      const result = locate(block.body, id, block.id);
      if (result) return result;
    }
  }
  return undefined;
}
/** Reconstrói somente caminhos necessários para substituir/remover um nó. */
function transform(
  blocks: readonly Block[],
  id: BlockId,
  replacement: Block | undefined,
): readonly Block[] {
  return blocks.flatMap((block) =>
    block.id === id
      ? replacement
        ? [replacement]
        : []
      : block.kind === 'repeat' || block.kind === 'define'
        ? [{ ...block, body: transform(block.body, id, replacement) }]
        : [block],
  );
}
/** Insere num corpo validado, conservando ordem de seus irmãos. */
function insert(blocks: readonly Block[], target: BodyTarget, block: Block): readonly Block[] {
  if (target.parentId === null)
    return [...blocks.slice(0, target.index), block, ...blocks.slice(target.index)];
  return blocks.map((item) =>
    item.id === target.parentId && (item.kind === 'repeat' || item.kind === 'define')
      ? { ...item, body: insert(item.body, { parentId: null, index: target.index }, block) }
      : item.kind === 'repeat' || item.kind === 'define'
        ? { ...item, body: insert(item.body, target, block) }
        : item,
  );
}
/** Agrega somente comentários pertencentes ao bloco e externos à instrução, para o movimento. */
function ownedSpan(context: ProjectionContext, block: Block): Span {
  const own = block.sourceSpan;
  if (!own) throw new ProjectionFailure('Bloco sem posição de fonte.');
  let start = own.start,
    end = own.end;
  for (const comment of context.projection.comments) {
    if (comment.blockId !== block.id) continue;
    if (comment.placement === 'leading' && comment.span.end <= own.start)
      start = Math.min(start, comment.span.start);
    if (comment.placement === 'trailing' && comment.span.start >= own.end)
      end = Math.max(end, comment.span.end);
  }
  return { start, end };
}
/** Escolhe fronteira antes dos comentários líderes do próximo irmão ou após o irmão anterior. */
function insertionOffset(context: ProjectionContext, target: BodyTarget): number {
  const body = context.bodies.get(target.parentId);
  if (!body || target.index > body.blocks.length)
    throw new ProjectionFailure(
      'O destino não é um corpo válido ou o índice está fora dele.',
      'INVALID_DROP_TARGET',
    );
  const next = body.blocks[target.index];
  if (next) return ownedSpan(context, next).start;
  const previous = body.blocks.at(-1);
  return previous
    ? ownedSpan(context, previous).end
    : target.parentId === null
      ? body.span.end
      : body.span.start;
}
/** Separa comandos sem permitir que um comentário engula o texto inserido. */
function separated(source: string, offset: number, text: string, newline: string): string {
  const before = source.slice(0, offset),
    after = source.slice(offset);
  return (
    (before.length && !before.endsWith('\n') ? newline : '') +
    text +
    (after.length && !after.startsWith('\n') ? newline : '')
  );
}
/** Monta patch atômico; alteração de trecho com comentário interno ambíguo é recusada. */
function tokenPatch(context: ProjectionContext, span: Span, text: string): Patch {
  if (
    context.projection.comments.some(
      (comment) => comment.span.start >= span.start && comment.span.end <= span.end,
    )
  )
    throw new ProjectionFailure(
      'Esta alteração substituiria uma expressão com comentário interno sem destino inequívoco. Edite esse trecho no Código.',
      'AMBIGUOUS_COMMENT_EDIT',
      span,
    );
  return { span, text };
}
/** Compara valores já reconstruídos e tipados sem tentar avaliar sua semântica. */
function sameValue(left: Value, right: Value): boolean {
  if (left.kind === 'number' && right.kind === 'number') return Object.is(left.value, right.value);
  if (left.kind === 'variable' && right.kind === 'variable') return left.name === right.name;
  if (left.kind === 'operator' && right.kind === 'operator')
    return (
      left.command === right.command &&
      sameValue(left.left, right.left) &&
      sameValue(left.right, right.right)
    );
  return false;
}

/** Localiza folha lexical dentro de parênteses sem consumir comentários do valor. */
function leafToken(
  context: ProjectionContext,
  node: LogoNode,
  kind: 'number' | 'variable' | 'symbol',
): Span {
  const text = context.projection.originalSource
    .slice(node.span.start, node.span.end)
    .replace(/;[^\r\n]*/g, (comment) => ' '.repeat(comment.length));
  const token = (
    kind === 'number' ? /\d+(?:\.\d+)?/ : kind === 'variable' ? /:[a-zA-Z]\w*/ : /"[a-zA-Z]\w*/
  ).exec(text);
  if (!token) throw new ProjectionFailure('Folha não localizada na fonte.');
  return {
    start: node.span.start + token.index,
    end: node.span.start + token.index + token[0].length,
  };
}
/** Conserva comentários e parênteses de uma folha ao mudar seu valor ou espécie. */
function leafPatches(context: ProjectionContext, node: LogoNode, value: Value): Patch[] {
  if (node.kind === 'variable')
    return [tokenPatch(context, leafToken(context, node, 'variable'), valueSource(value))];
  if (node.kind !== 'number') throw new ProjectionFailure('A folha não é numérica.');
  const span = leafToken(context, node, 'number'),
    prefix = context.projection.originalSource
      .slice(node.span.start, span.start)
      .replace(/;[^\r\n]*/g, (comment) => ' '.repeat(comment.length));
  const signs = [...prefix.matchAll(/[+-]/g)];
  const sign = signs.at(-1);
  return [
    ...(sign
      ? [
          tokenPatch(
            context,
            { start: node.span.start + sign.index, end: node.span.start + sign.index + 1 },
            '',
          ),
        ]
      : []),
    tokenPatch(context, span, valueSource(value)),
  ];
}
/** Preserva operadores/aliases/parentização e muda somente folhas realmente alteradas. */
function valuePatches(context: ProjectionContext, node: LogoNode, value: Value): Patch[] {
  const before = projectValue(node);
  if (sameValue(before, value)) return [];
  if (node.kind === 'number' || node.kind === 'variable') return leafPatches(context, node, value);
  if (
    before.kind === 'operator' &&
    value.kind === 'operator' &&
    node.kind === 'call' &&
    (before.command === value.command || !infixCatalog[node.name])
  ) {
    const left = node.args[0],
      right = node.args[1];
    if (!left || !right) throw new ProjectionFailure('Expressão incompleta na projeção.');
    return [
      ...(before.command !== value.command
        ? [tokenPatch(context, nameSpan(context.projection.originalSource, node), value.command)]
        : []),
      ...valuePatches(context, left, value.left),
      ...valuePatches(context, right, value.right),
    ];
  }
  return [tokenPatch(context, node.span, valueSource(value))];
}
/** Seleciona argumento localizado de um comando projetado. */
function arg(node: LogoNode, index: number): LogoNode {
  if (node.kind !== 'call' || !node.args[index])
    throw new ProjectionFailure('Argumento não localizado na fonte.');
  return node.args[index];
}
/** Atualiza campos no texto, preservando corpos e comentários que não mudaram. */
function replacementPatches(
  context: ProjectionContext,
  old: Block,
  next: Block,
  newline: string,
): Patch[] {
  const node = context.nodes.get(old.id);
  if (!node) throw new ProjectionFailure('Bloco não localizado na fonte.');
  if (sameBlocks([old], [next])) return [];
  if (old.kind === next.kind) {
    switch (old.kind) {
      case 'move':
        if (next.kind === 'move')
          return [
            ...(old.command !== next.command
              ? [
                  tokenPatch(
                    context,
                    nameSpan(context.projection.originalSource, node),
                    next.command,
                  ),
                ]
              : []),
            ...valuePatches(context, arg(node, 0), next.value),
          ];
        break;
      case 'position':
        if (next.kind === 'position')
          return [
            ...valuePatches(context, arg(node, 0), next.x),
            ...valuePatches(context, arg(node, 1), next.y),
          ];
        break;
      case 'pen':
        if (next.kind === 'pen')
          return [
            tokenPatch(context, nameSpan(context.projection.originalSource, node), next.command),
          ];
        break;
      case 'make':
        if (next.kind === 'make')
          return [
            ...(old.name !== next.name
              ? [tokenPatch(context, leafToken(context, arg(node, 0), 'symbol'), '"' + next.name)]
              : []),
            ...valuePatches(context, arg(node, 1), next.value),
          ];
        break;
      case 'call':
        if (next.kind === 'call')
          return [
            tokenPatch(context, nameSpan(context.projection.originalSource, node), next.name),
          ];
        break;
      case 'color':
        if (next.kind === 'color') {
          const list = arg(node, 0);
          if (list.kind !== 'list') break;
          return next.rgb.flatMap((value, index) => {
            const item = list.items[index];
            if (!item) throw new ProjectionFailure('Cor incompleta na fonte.');
            return value === old.rgb[index]
              ? []
              : valuePatches(context, item, { kind: 'number', value });
          });
        }
        break;
      case 'repeat':
        if (next.kind === 'repeat' && sameBlocks(old.body, next.body))
          return valuePatches(context, arg(node, 0), next.times);
        break;
      case 'define':
        if (next.kind === 'define' && sameBlocks(old.body, next.body))
          return old.name !== next.name
            ? [
                tokenPatch(
                  context,
                  nameSpan(context.projection.originalSource, node, true),
                  next.name,
                ),
              ]
            : [];
        break;
    }
  }
  return [tokenPatch(context, node.span, blockSource(next, 0, newline))];
}
/** Aplica patches da direita para a esquerda e impede intervalos sobrepostos. */
function applyPatches(source: string, patches: readonly Patch[]): string {
  const sorted = patches.toSorted(
    (left, right) => right.span.start - left.span.start || right.span.end - left.span.end,
  );
  let previous = source.length;
  for (const patch of sorted) {
    if (patch.span.start < 0 || patch.span.end > previous || patch.span.end > source.length)
      throw new ProjectionFailure('A edição contém trechos sobrepostos.', 'AMBIGUOUS_SOURCE_EDIT');
    source = source.slice(0, patch.span.start) + patch.text + source.slice(patch.span.end);
    previous = patch.span.start;
  }
  return source;
}
/** Edita árvore e fonte numa transação pura; falhas nunca expõem um documento intermediário. */
export function editBlocks(projection: Projection, input: BlockAction): Result<Projection> {
  try {
    const context = checkedContext(projection),
      current = context.projection,
      action = readAction(input),
      newline = current.originalSource.includes('\r\n') ? '\r\n' : '\n';
    if (current.sourceRevision >= Number.MAX_SAFE_INTEGER)
      throw new ProjectionFailure(
        'A revisão excedeu o limite seguro.',
        'PROJECTION_REVISION_LIMIT',
      );
    let blocks = current.blocks;
    let patches: Patch[] = [];
    if (action.type === 'insert') {
      const offset = insertionOffset(context, action.target);
      blocks = insert(blocks, action.target, action.block);
      patches = [
        {
          span: { start: offset, end: offset },
          text: separated(
            current.originalSource,
            offset,
            blockSource(action.block, 0, newline),
            newline,
          ),
        },
      ];
    } else {
      const located = locate(blocks, action.id);
      if (!located)
        throw new ProjectionFailure('O bloco da edição não existe mais.', 'BLOCK_NOT_FOUND');
      if (action.type === 'replace') {
        blocks = transform(blocks, action.id, action.block);
        patches = replacementPatches(context, located.block, action.block, newline);
      } else if (action.type === 'remove') {
        const span = located.block.sourceSpan;
        if (!span) throw new ProjectionFailure('Bloco sem posição na fonte.');
        const comments = current.comments.filter(
          (comment) => comment.span.start >= span.start && comment.span.end <= span.end,
        );
        blocks = transform(blocks, action.id, undefined);
        patches = [{ span, text: comments.map((comment) => comment.text + newline).join('') }];
      } else {
        const offset = insertionOffset(context, action.target),
          destination = { ...action.target };
        if (
          action.target.parentId !== null &&
          blockIdentities([located.block]).includes(action.target.parentId)
        )
          throw new ProjectionFailure(
            'Um bloco não pode ser movido para dentro de si mesmo.',
            'BLOCK_CYCLE',
          );
        if (located.parentId === destination.parentId && located.index < destination.index)
          destination.index--;
        const span = ownedSpan(context, located.block);
        if (
          !(located.parentId === destination.parentId && located.index === destination.index) &&
          (offset < span.start || offset > span.end)
        ) {
          blocks = insert(transform(blocks, action.id, undefined), destination, located.block);
          patches = [
            { span, text: '' },
            {
              span: { start: offset, end: offset },
              text: separated(
                current.originalSource,
                offset,
                current.originalSource.slice(span.start, span.end),
                newline,
              ),
            },
          ];
        }
      }
    }
    blocks = readBlocks(blocks);
    const source = applyPatches(current.originalSource, patches),
      next = projectionContext(source, current.sourceRevision + 1, blockIdentities(blocks));
    if (!sameBlocks(blocks, next.projection.blocks))
      throw new ProjectionFailure(
        'A alteração não preserva integralmente o programa. Edite esse trecho no Código.',
        'AMBIGUOUS_SOURCE_EDIT',
      );
    if (
      JSON.stringify(current.comments.map((comment) => comment.text).toSorted()) !==
      JSON.stringify(next.projection.comments.map((comment) => comment.text).toSorted())
    )
      throw new ProjectionFailure(
        'A alteração não conservaria todos os comentários.',
        'COMMENT_LOSS',
      );
    return succeed(next.projection);
  } catch (error) {
    return projectionFailure(error);
  }
}
