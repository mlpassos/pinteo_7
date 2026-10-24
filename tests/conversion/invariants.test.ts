import { describe, expect, it } from 'vitest';
import {
  sourceToBlocks,
  blocksToSource,
  editBlocks,
  createBlockId,
  type Projection,
  type Block,
  type BlockId,
  type BlockAction,
} from '../../src/core/program/index.js';

/** Materializa cenário válido antes de enviar ações JavaScript hostis. */
function project(source = 'repeat 2 [forward 1]\nright 90'): Projection {
  const result = sourceToBlocks(source, 0);
  if (!result.ok) throw new Error('Cenário inválido');
  return result.value;
}
/** Cria identidade de ação na fronteira real. */
function id(value: string): BlockId {
  const result = createBlockId(value);
  if (!result.ok) throw new Error('ID inválido');
  return result.value;
}
/** Invoca a API como JavaScript externo, preservando unknown sem fabricar tipos válidos. */
function unsafeEdit(projection: unknown, action: unknown): unknown {
  return Reflect.apply(editBlocks, undefined, [projection, action]) as unknown;
}
/** Invoca serialização como fronteira externa. */
function unsafeSource(projection: unknown): unknown {
  return Reflect.apply(blocksToSource, undefined, [projection]) as unknown;
}
/** Retira bloco do corpo de repetição para os cenários de identidade. */
function child(p: Projection): Block {
  const loop = p.blocks[0];
  if (loop?.kind !== 'repeat' || !loop.body[0]) throw new Error('Corpo ausente');
  return loop.body[0];
}
/** Exige edição válida antes de encadear ações sem recompor a fonte manualmente. */
function edit(p: Projection, action: BlockAction): Projection {
  const result = editBlocks(p, action);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}

describe('fronteira runtime, IDs e integridade de projeção', () => {
  it.each([
    null,
    {},
    [],
    { type: 'bogus' },
    { type: 'move', id: '<img>', target: { parentId: null, index: 0 } },
    {
      type: 'insert',
      block: { kind: 'move', id: 'valid', command: 'eval', value: { kind: 'number', value: 1 } },
      target: { parentId: null, index: 0 },
    },
    {
      type: 'insert',
      block: {
        kind: 'move',
        id: 'valid',
        command: 'forward',
        value: { kind: 'number', value: Infinity },
      },
      target: { parentId: null, index: 0 },
    },
  ])('recusa ação externa inválida sem mutar: %j', (action) => {
    const p = project(),
      before = JSON.stringify(p);
    expect(unsafeEdit(p, action)).toMatchObject({ ok: false });
    expect(JSON.stringify(p)).toBe(before);
  });
  it('recusa ID repetido em inserção/subárvore e replace que troca identidade', () => {
    const p = project(),
      block = child(p);
    expect(
      unsafeEdit(p, { type: 'insert', block, target: { parentId: null, index: 0 } }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'DUPLICATE_BLOCK_ID' }] });
    expect(
      unsafeEdit(p, { type: 'replace', id: block.id, block: { ...block, id: 'another' } }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'REPLACE_ID_MISMATCH' }] });
    expect(
      unsafeEdit(p, {
        type: 'insert',
        block: {
          kind: 'repeat',
          id: 'new',
          times: { kind: 'number', value: 2 },
          body: [block, block],
        },
        target: { parentId: null, index: 0 },
      }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'DUPLICATE_BLOCK_ID' }] });
  });
  it('recusa ancestral em descendente, corpo inexistente, folha como pai e índices fora', () => {
    const p = project(),
      loop = p.blocks[0],
      leaf = child(p);
    if (!loop) throw new Error('Ausente');
    expect(
      editBlocks(p, { type: 'move', id: loop.id, target: { parentId: loop.id, index: 0 } }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'BLOCK_CYCLE' }] });
    for (const target of [
      { parentId: leaf.id, index: 0 },
      { parentId: id('absent'), index: 0 },
      { parentId: null, index: 99 },
      { parentId: null, index: -1 },
      { parentId: null, index: NaN },
    ])
      expect(unsafeEdit(p, { type: 'move', id: leaf.id, target })).toMatchObject({ ok: false });
  });
  it('recusa ciclos reais em valores/corpos e grafos compartilhados expansivos', () => {
    const p = project();
    const cyclic: Record<string, unknown> = {
      kind: 'operator',
      command: 'sum',
      right: { kind: 'number', value: 1 },
    };
    cyclic.left = cyclic;
    expect(
      unsafeEdit(p, {
        type: 'insert',
        block: { kind: 'move', id: 'new', command: 'forward', value: cyclic },
        target: { parentId: null, index: 0 },
      }),
    ).toMatchObject({ ok: false });
    let value: unknown = { kind: 'number', value: 1 };
    for (let i = 0; i < 30; i++)
      value = { kind: 'operator', command: 'sum', left: value, right: value };
    expect(
      unsafeEdit(p, {
        type: 'insert',
        block: { kind: 'move', id: 'new', command: 'forward', value },
        target: { parentId: null, index: 0 },
      }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'PROJECTION_LIMIT' }] });
    const cycle: Record<string, unknown> = {
      kind: 'repeat',
      id: 'new',
      times: { kind: 'number', value: 1 },
    };
    cycle.body = [cycle];
    expect(
      unsafeEdit(p, { type: 'insert', block: cycle, target: { parentId: null, index: 0 } }),
    ).toMatchObject({ ok: false });
  });
  it('recusa procedimento dentro de procedimento mesmo através de repeat', () => {
    const p = project('to outer repeat 1 [] end');
    const outer = p.blocks[0];
    if (outer?.kind !== 'define' || !outer.body[0]) throw new Error('Ausente');
    expect(
      editBlocks(p, {
        type: 'insert',
        block: { kind: 'define', id: id('inner'), name: 'inner', body: [] },
        target: { parentId: outer.body[0].id, index: 0 },
      }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'NESTED_PROCEDURE' }] });
  });
  it('recusa fonte adulterada e comentários adulterados antes de serializar ou editar', () => {
    const p = project('; comentário\nforward 1');
    expect(unsafeSource({ ...p, originalSource: 'forward 99' })).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'STALE_PROJECTION' }],
    });
    expect(unsafeSource({ ...p, comments: [] })).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'STALE_PROJECTION' }],
    });
    expect(unsafeSource({ ...p, sourceRevision: -1 })).toMatchObject({ ok: false });
    expect(unsafeSource({ ...p, blocks: [{ ...p.blocks[0], id: '<bad>' }] })).toMatchObject({
      ok: false,
    });
  });
  it('limita fonte, blocos, revisão e comentários sem erro de stack', () => {
    expect(sourceToBlocks('forward 1\n'.repeat(2001), 0)).toMatchObject({ ok: false });
    expect(sourceToBlocks('repeat 1 ['.repeat(66) + ']'.repeat(66), 0)).toMatchObject({
      ok: false,
    });
    expect(sourceToBlocks('forward 1', Number.NaN)).toMatchObject({ ok: false });
    const p = sourceToBlocks('forward 1', Number.MAX_SAFE_INTEGER);
    expect(p.ok).toBe(true);
    if (p.ok)
      expect(
        editBlocks(p.value, { type: 'remove', id: p.value.blocks[0]?.id ?? id('fallback') }),
      ).toMatchObject({ ok: false, diagnostics: [{ code: 'PROJECTION_REVISION_LIMIT' }] });
    const comments = ';\n'.repeat(3000);
    const projection = sourceToBlocks(comments, 0);
    expect(projection.ok).toBe(true);
    if (projection.ok)
      expect(blocksToSource(projection.value)).toEqual({ ok: true, value: comments });
  });
});

describe('edições encadeadas com spans/identidades atuais', () => {
  it('usa resultado direto de editBlocks na próxima edição preservando comentários e revisão', () => {
    let p = project('; topo\r\nrepeat 2 [fd 1 ; dentro\r\n]\r\nrt 90');
    const first = p.blocks[0];
    if (first?.kind !== 'repeat') throw new Error('Ausente');
    const leaf = first.body[0];
    if (leaf?.kind !== 'move') throw new Error('Ausente');
    p = edit(p, {
      type: 'replace',
      id: leaf.id,
      block: { ...leaf, value: { kind: 'number', value: 12 } },
    });
    p = edit(p, { type: 'move', id: leaf.id, target: { parentId: null, index: 2 } });
    const moved = p.blocks.find((block) => block.id === leaf.id);
    if (moved?.kind !== 'move') throw new Error('Ausente');
    p = edit(p, {
      type: 'replace',
      id: leaf.id,
      block: { ...moved, value: { kind: 'number', value: 123 } },
    });
    expect(p.sourceRevision).toBe(3);
    expect(p.originalSource).toContain('fd 123 ; dentro');
    expect(p.comments.map((comment) => comment.text)).toEqual(['; topo', '; dentro']);
  });
  it('não compartilha valores de ação mutável com a projeção devolvida', () => {
    const p = project('');
    const value = { kind: 'number' as const, value: 2 };
    const result = edit(p, {
      type: 'insert',
      target: { parentId: null, index: 0 },
      block: { kind: 'move', id: id('new'), command: 'forward', value },
    });
    value.value = 99;
    expect(result.blocks[0]).toMatchObject({ kind: 'move', value: { kind: 'number', value: 2 } });
  });
  it('mantém chamadas quando a definição é removida explicitamente', () => {
    const p = project('to square forward 1 end square'),
      definition = p.blocks[0];
    if (!definition) throw new Error('Ausente');
    expect(edit(p, { type: 'remove', id: definition.id }).blocks).toMatchObject([
      { kind: 'call', name: 'square' },
    ]);
  });
});
