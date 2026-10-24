import { describe, expect, it, vi } from 'vitest';
import {
  sourceToBlocks,
  blocksToSource,
  editBlocks,
  createBlockId,
  type Block,
  type BlockId,
  type Projection,
} from '../../src/core/program/index.js';
import { LogoEngine } from '../../src/core/logo/index.js';

/** Exige sucesso da projeção para tornar falhas do cenário de teste explícitas. */
function project(source: string, revision = 0): Projection {
  const result = sourceToBlocks(source, revision);
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
/** Cria IDs pelo mesmo limite público usado pela UI. */
function id(value: string): BlockId {
  const result = createBlockId(value);
  if (!result.ok) throw new Error('ID do teste inválido');
  return result.value;
}
/** Exige primeiro bloco do cenário, preservando a união discriminada. */
function first(projection: Projection): Block {
  const block = projection.blocks[0];
  if (!block) throw new Error('Bloco ausente');
  return block;
}
/** Finaliza edição e fonte somente quando ambas as fronteiras concordam. */
function edited(projection: Projection, action: Parameters<typeof editBlocks>[1]): Projection {
  const result = editBlocks(projection, action);
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  expect(blocksToSource(result.value)).toEqual({ ok: true, value: result.value.originalSource });
  return result.value;
}

const supported =
  '; programa\r\nmake "lado 5\r\nto quadrado\r\n  repeat 4 [fd :lado rt (sum 40 50)]\r\nend\r\nquadrado\r\nsetxy -5 (2 + 3 * 4)\r\npu pd reset colour [1 2 3]\r\nbk (difference 5 2) lt (divide (product 2 3) 2) setx 1 sety 2\r\n';

describe('conversão integral sem execução', () => {
  it.each([
    '',
    '; só comentário\r\n',
    supported,
    'to vazio end vazio',
    'forward 0 forward -0',
    'fd 2 + 3 * 4',
  ])('preserva fonte byte-exata na alternância: %s', (source) => {
    const projection = project(source, 7);
    expect(blocksToSource(projection)).toEqual({ ok: true, value: source });
    expect(projection.sourceRevision).toBe(7);
  });
  it('projeta todos os 19 itens, com quatro operadores em slots, aliases e corpos', () => {
    const p = project(supported);
    expect(p.blocks.map((block) => block.kind)).toEqual([
      'make',
      'define',
      'call',
      'position',
      'pen',
      'pen',
      'pen',
      'color',
      'move',
      'move',
      'move',
      'move',
    ]);
    const definition = p.blocks[1];
    expect(definition).toMatchObject({
      kind: 'define',
      body: [
        {
          kind: 'repeat',
          body: [
            { kind: 'move', command: 'forward', value: { kind: 'variable', name: 'lado' } },
            { kind: 'move', command: 'right', value: { kind: 'operator', command: 'sum' } },
          ],
        },
      ],
    });
  });
  it('não chama o interpretador enquanto analisa ou serializa', () => {
    const spy = vi.spyOn(LogoEngine.prototype, 'run').mockImplementation(() => {
      throw new Error('Conversão executou LOGO');
    });
    try {
      const p = project('repeat 1000000000 []');
      expect(blocksToSource(p)).toMatchObject({ ok: true });
    } finally {
      spy.mockRestore();
    }
  });
  it.each([
    'forward random 100',
    'if true [forward 10]',
    'to square :x forward :x end square 3',
    'forward',
    'color [random 255 2 3]',
    'color [1.5 2 3]',
    'forward [1 2]',
    'sum 1 2',
    'stop',
    'print 1',
    'setpos [1 2]',
  ])('recusa tudo sem alterar fonte: %s', (source) => {
    const result = sourceToBlocks(source, 0);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.diagnostics[0]?.span).toBeDefined();
  });
  it('permite chamada sem argumentos cuja definição pode estar na sessão', () => {
    expect(first(project('meuprocedimento'))).toMatchObject({
      kind: 'call',
      name: 'meuprocedimento',
    });
  });
});

describe('edições locais e comentários', () => {
  it('edita folha em expressão com comentário interno preservando alias, formato e CRLF', () => {
    const source = 'FD (add 1 ; esquerda\r\n  2) ; fim\r\nright 90\r\n';
    const p = project(source),
      block = first(p);
    if (block.kind !== 'move' || block.value.kind !== 'operator')
      throw new Error('Cenário inválido');
    const result = edited(p, {
      type: 'replace',
      id: block.id,
      block: { ...block, value: { ...block.value, right: { kind: 'number', value: 3 } } },
    });
    expect(result.originalSource).toBe('FD (add 1 ; esquerda\r\n  3) ; fim\r\nright 90\r\n');
    expect(p.originalSource).toBe(source);
    expect(result.sourceRevision).toBe(1);
    expect(first(result).id).toBe(block.id);
  });
  it('recusa somente a substituição de expressão cujo comentário interno perderia destino', () => {
    const p = project('forward (sum 1 ; detalhe\n2)\nright 90');
    const block = first(p);
    if (block.kind !== 'move') throw new Error('Inválido');
    expect(
      editBlocks(p, {
        type: 'replace',
        id: block.id,
        block: { ...block, value: { kind: 'number', value: 4 } },
      }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'AMBIGUOUS_COMMENT_EDIT' }] });
    const other = p.blocks[1];
    if (other?.kind !== 'move') throw new Error('Inválido');
    expect(
      edited(p, {
        type: 'replace',
        id: other.id,
        block: { ...other, value: { kind: 'number', value: 45 } },
      }).originalSource,
    ).toBe('forward (sum 1 ; detalhe\n2)\nright 45');
  });
  it('remove corpo mas preserva todos os comentários internos e adjacentes', () => {
    const p = project('; antes\nrepeat 2 [forward 1 ; dentro\nright 90]\n; depois\nforward 3');
    const block = first(p);
    const result = edited(p, { type: 'remove', id: block.id });
    for (const text of ['; antes', '; dentro', '; depois'])
      expect(result.originalSource).toContain(text);
    expect(result.blocks).toHaveLength(1);
  });
  it('move bloco com comentário líder e final e atualiza todos os offsets', () => {
    const p = project('; peça um\nforward 1 ; fim um\nright 90\nbackward 2');
    const block = first(p),
      result = edited(p, { type: 'move', id: block.id, target: { parentId: null, index: 3 } });
    expect(result.blocks.map((entry) => entry.id)).toEqual([
      p.blocks[1]?.id,
      p.blocks[2]?.id,
      block.id,
    ]);
    expect(result.originalSource.indexOf('; peça um')).toBeGreaterThan(
      result.originalSource.indexOf('backward'),
    );
    expect(result.originalSource.indexOf('; fim um')).toBeGreaterThan(
      result.originalSource.indexOf('forward'),
    );
    const moved = result.blocks[2];
    expect(result.originalSource.slice(moved?.sourceSpan?.start, moved?.sourceSpan?.end)).toBe(
      'forward 1',
    );
  });
  it('ajusta índice uma única vez em movimentos no mesmo corpo, acima/abaixo e no-op', () => {
    let p = project('forward 1\nright 90\nbackward 2');
    const block = first(p);
    p = edited(p, { type: 'move', id: block.id, target: { parentId: null, index: 2 } });
    expect(p.blocks.map((entry) => entry.id)).toEqual(['b2', 'b1', 'b3']);
    p = edited(p, { type: 'move', id: block.id, target: { parentId: null, index: 0 } });
    expect(p.blocks.map((entry) => entry.id)).toEqual(['b1', 'b2', 'b3']);
    expect(
      edited(p, { type: 'move', id: block.id, target: { parentId: null, index: 1 } })
        .originalSource,
    ).toBe(p.originalSource);
  });
  it('insere e move entre corpos sem normalizar trechos intocados', () => {
    let p = project('repeat 2 [\n  fd 1 ; corpo\n]\nRIGHT 90');
    const loop = first(p);
    p = edited(p, {
      type: 'insert',
      block: { kind: 'pen', command: 'penup', id: id('new') },
      target: { parentId: loop.id, index: 1 },
    });
    expect(p.originalSource).toContain('  fd 1 ; corpo');
    expect(p.originalSource).toContain('RIGHT 90');
    const right = p.blocks[1];
    if (!right) throw new Error('Ausente');
    p = edited(p, { type: 'move', id: right.id, target: { parentId: loop.id, index: 0 } });
    expect(p.blocks).toHaveLength(1);
    expect(first(p)).toMatchObject({
      kind: 'repeat',
      body: [
        { kind: 'move', command: 'right' },
        { kind: 'move', command: 'forward' },
        { kind: 'pen' },
      ],
    });
  });
});

describe('nomes Papert e valores finitos extremos', () => {
  it('projeta e renomeia procedimento com ponto inicial demonstrado no legado', () => {
    const p = project('to .forma forward 1 end .forma');
    const block = first(p);
    if (block.kind !== 'define') throw new Error('Definição ausente');
    expect(
      edited(p, { type: 'replace', id: block.id, block: { ...block, name: '.outra' } })
        .originalSource,
    ).toBe('to .outra forward 1 end .forma');
  });
  it('distingue zero negativo dentro de expressão ao editar folha', () => {
    const p = project('forward sum -0 1'),
      block = first(p);
    if (block.kind !== 'move' || block.value.kind !== 'operator')
      throw new Error('Cenário inválido');
    expect(
      edited(p, {
        type: 'replace',
        id: block.id,
        block: { ...block, value: { ...block.value, left: { kind: 'number', value: 0 } } },
      }).originalSource,
    ).toBe('forward sum 0 1');
  });
  it.each([1e21, 1e-20, Number.MAX_VALUE, Number.MIN_VALUE, -1e25])(
    'serializa %s em decimal legível pelo parser',
    (value) => {
      const p = edited(project(''), {
        type: 'insert',
        target: { parentId: null, index: 0 },
        block: { id: id('n'), kind: 'move', command: 'forward', value: { kind: 'number', value } },
      });
      expect(first(p)).toMatchObject({ kind: 'move', value: { kind: 'number', value } });
    },
  );
});

describe('comentários em cabeçalhos, corpos e slots', () => {
  it('troca operador prefixo sem apagar comentário interno entre operandos', () => {
    const p = project('fd (sum 1 ; mantenha\n2)'),
      block = first(p);
    if (block.kind !== 'move' || block.value.kind !== 'operator')
      throw new Error('Cenário inválido');
    expect(
      edited(p, {
        type: 'replace',
        id: block.id,
        block: { ...block, value: { ...block.value, command: 'product' } },
      }).originalSource,
    ).toBe('fd (product 1 ; mantenha\n2)');
  });
  it('preserva comentário no cabeçalho de repeat, RGB e nome de definição', () => {
    let p = project('repeat ; vezes\n2 [fd 1]\ncolor [1 ; verde\n2 3]\nto ; nome\nfoo end');
    const repeat = p.blocks[0],
      color = p.blocks[1],
      definition = p.blocks[2];
    if (repeat?.kind !== 'repeat' || color?.kind !== 'color' || definition?.kind !== 'define')
      throw new Error('Cenário inválido');
    p = edited(p, {
      type: 'replace',
      id: repeat.id,
      block: { ...repeat, times: { kind: 'number', value: 3 } },
    });
    p = edited(p, { type: 'replace', id: color.id, block: { ...color, rgb: [4, 5, 6] } });
    p = edited(p, { type: 'replace', id: definition.id, block: { ...definition, name: 'bar' } });
    expect(p.originalSource).toBe(
      'repeat ; vezes\n3 [fd 1]\ncolor [4 ; verde\n5 6]\nto ; nome\nbar end',
    );
  });
  it('move líderes de filho junto ao bloco, mantendo comentário de programa separado por linha vazia', () => {
    const p = project('; cabeçalho\n\nrepeat 2 [\n; filho\nfd 1 ; final\n]\nright 90'),
      loop = first(p);
    if (loop.kind !== 'repeat' || !loop.body[0]) throw new Error('Cenário inválido');
    const result = edited(p, {
      type: 'move',
      id: loop.body[0].id,
      target: { parentId: null, index: 2 },
    });
    expect(result.originalSource.startsWith('; cabeçalho\n\n')).toBe(true);
    expect(result.originalSource.indexOf('; filho')).toBeGreaterThan(
      result.originalSource.indexOf('right'),
    );
    expect(result.originalSource.indexOf('; final')).toBeGreaterThan(
      result.originalSource.indexOf('fd 1'),
    );
  });
  it('substitui tipo sem comentário interno e recusa só o bloco com ambiguidade', () => {
    const p = project('fd 1 ; adjacente\nrepeat 2 [fd 1 ; interno\n]'),
      block = first(p);
    expect(
      edited(p, {
        type: 'replace',
        id: block.id,
        block: { kind: 'pen', id: block.id, command: 'penup' },
      }).originalSource,
    ).toBe('penup ; adjacente\nrepeat 2 [fd 1 ; interno\n]');
    const loop = p.blocks[1];
    if (!loop) throw new Error('Ausente');
    expect(
      editBlocks(p, {
        type: 'replace',
        id: loop.id,
        block: { kind: 'pen', id: loop.id, command: 'penup' },
      }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'AMBIGUOUS_COMMENT_EDIT' }] });
  });
});

it('edita folhas parentizadas com comentários sem confundir comentários com nome ou número', () => {
  let p = project(
    'forward (- ; sinal\n1 ; nota 999\n)\nmake ("x ; nome y\n) 2\ncolor [(1 ; vermelho 555\n) 2 3]',
  );
  const move = p.blocks[0],
    make = p.blocks[1],
    color = p.blocks[2];
  if (move?.kind !== 'move' || make?.kind !== 'make' || color?.kind !== 'color')
    throw new Error('Cenário inválido');
  p = edited(p, {
    type: 'replace',
    id: move.id,
    block: { ...move, value: { kind: 'number', value: 5 } },
  });
  p = edited(p, { type: 'replace', id: make.id, block: { ...make, name: 'novo' } });
  p = edited(p, { type: 'replace', id: color.id, block: { ...color, rgb: [4, 2, 3] } });
  expect(p.originalSource).toBe(
    'forward ( ; sinal\n5 ; nota 999\n)\nmake ("novo ; nome y\n) 2\ncolor [(4 ; vermelho 555\n) 2 3]',
  );
});
