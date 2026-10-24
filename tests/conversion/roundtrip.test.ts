import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LogoEngine } from '../../src/core/logo/index.js';
import { runLegacy } from '../../scripts/legacy/harness.mjs';
import {
  sourceToBlocks,
  blocksToSource,
  editBlocks,
  createBlockId,
  type Block,
  type BlockId,
  type Projection,
} from '../../src/core/program/index.js';

/** Cria identidade validada para blocos montados sem fonte prévia. */
function id(name: string): BlockId {
  const result = createBlockId(name);
  if (!result.ok) throw new Error('ID inválido');
  return result.value;
}
/** Inicia projeção por análise real, nunca por fake da serialização. */
function project(source: string): Projection {
  const result = sourceToBlocks(source, 0);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
/** Captura motor para comparação semântica sem invocá-lo dentro do conversor. */
function run(source: string): {
  effects: ReturnType<LogoEngine['takeEffects']>;
  view: ReturnType<LogoEngine['turtle']['view']>;
} {
  const engine = new LogoEngine();
  expect(engine.run(source)).toEqual({ ok: true, value: undefined });
  return { effects: engine.takeEffects(), view: engine.turtle.view() };
}
const fixtures = new URL('../fixtures/legacy/originals/compartilhados-code/', import.meta.url);
const files = readdirSync(fixtures)
  .filter((name) => name.endsWith('.txt'))
  .sort();

describe('round-trip semântico e patrimônio preservado', () => {
  it('serializa todos os tipos visuais e operadores com semântica do LOGO de referência', () => {
    const blocks: Block[] = [
      {
        kind: 'make',
        id: id('variable'),
        name: 'lado',
        value: {
          kind: 'operator',
          command: 'sum',
          left: { kind: 'number', value: 4 },
          right: {
            kind: 'operator',
            command: 'product',
            left: { kind: 'number', value: 2 },
            right: { kind: 'number', value: 3 },
          },
        },
      },
      {
        kind: 'define',
        id: id('procedure'),
        name: 'forma',
        body: [
          {
            kind: 'repeat',
            id: id('loop'),
            times: { kind: 'number', value: 4 },
            body: [
              {
                kind: 'move',
                id: id('forward'),
                command: 'forward',
                value: { kind: 'variable', name: 'lado' },
              },
              {
                kind: 'move',
                id: id('right'),
                command: 'right',
                value: { kind: 'number', value: 90 },
              },
            ],
          },
        ],
      },
      { kind: 'color', id: id('color'), rgb: [220, 45, 0] },
      { kind: 'pen', id: id('up'), command: 'penup' },
      {
        kind: 'position',
        id: id('position'),
        x: { kind: 'number', value: 5 },
        y: { kind: 'number', value: 7 },
      },
      { kind: 'pen', id: id('down'), command: 'pendown' },
      { kind: 'call', id: id('call'), name: 'forma' },
      {
        kind: 'move',
        id: id('backward'),
        command: 'backward',
        value: {
          kind: 'operator',
          command: 'divide',
          left: { kind: 'number', value: 3 },
          right: { kind: 'number', value: 2 },
        },
      },
      {
        kind: 'move',
        id: id('left'),
        command: 'left',
        value: {
          kind: 'operator',
          command: 'difference',
          left: { kind: 'number', value: 90 },
          right: { kind: 'number', value: 45 },
        },
      },
      { kind: 'move', id: id('x'), command: 'setx', value: { kind: 'number', value: 10 } },
      { kind: 'move', id: id('y'), command: 'sety', value: { kind: 'number', value: 20 } },
    ];
    let projection = project('');
    for (const block of blocks) {
      const result = editBlocks(projection, {
        type: 'insert',
        block,
        target: { parentId: null, index: projection.blocks.length },
      });
      expect(result).toMatchObject({ ok: true });
      if (!result.ok) throw new Error(JSON.stringify(result));
      projection = result.value;
    }
    const serialized = blocksToSource(projection);
    if (!serialized.ok) throw new Error('Serialização falhou');
    const reference =
      'make "lado sum 4 product 2 3 to forma repeat 4 [fd :lado rt 90] end colour [220 45 0] pu setxy 5 7 pd forma bk divide 3 2 lt difference 90 45 setx 10 sety 20';
    expect(run(serialized.value)).toEqual(run(reference));
    expect(runLegacy([{ kind: 'run', source: serialized.value }])).toMatchObject({
      snapshots: [{ position: { x: 10, y: 20 }, heading: 225, error: null }],
      exceptions: [],
    });
  });
  it('move peça mantendo apenas a semântica da ordem explicitamente escolhida', () => {
    const before = project('fd 10 ; linha\nrt 90\nfd 5');
    const block = before.blocks[0];
    if (!block) throw new Error('Ausente');
    const result = editBlocks(before, {
      type: 'move',
      id: block.id,
      target: { parentId: null, index: 3 },
    });
    if (!result.ok) throw new Error(JSON.stringify(result));
    expect(run(result.value.originalSource)).toEqual(run('rt 90 fd 5 fd 10'));
  });
  it.each(files)('preserva TXT original intacto na projeção ou recusa integral: %s', (file) => {
    const source = readFileSync(new URL(file, fixtures), 'utf8'),
      before = source;
    const result = sourceToBlocks(source, 0);
    if (result.ok) {
      expect(blocksToSource(result.value)).toEqual({ ok: true, value: source });
      expect(run(result.value.originalSource)).toEqual(run(source));
    } else expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(source).toBe(before);
  });
});

it('os 34 TXT preservados são integralmente representáveis pelo subconjunto atual', () => {
  expect(files).toHaveLength(34);
  for (const file of files) {
    const source = readFileSync(new URL(file, fixtures), 'utf8');
    expect(sourceToBlocks(source, 0), file).toMatchObject({ ok: true });
  }
});
