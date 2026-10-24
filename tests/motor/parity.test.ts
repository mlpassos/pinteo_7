import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { LogoEngine, commandCatalog } from '../../src/core/logo/index.js';
import type { DrawOp } from '../../src/core/turtle/index.js';

/** Valida um objeto externo antes de acessar a captura legada. */
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Objeto inválido');
  return value as Record<string, unknown>;
}
/** Valida uma lista externa conservando conteúdo unknown. */
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Lista inválida');
  return value;
}
/** Exige número da fixture antes de projetar operação comparável. */
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Número inválido');
  return value;
}
/** Converte folha numérica em comparação portátil, sem alterar estrutura ou baseline. */
function tolerant(value: unknown): unknown {
  if (typeof value === 'number') return expect.closeTo(value, 9);
  if (Array.isArray(value)) return value.map((item: unknown) => tolerant(item));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(record(value)).map(([key, item]) => [key, tolerant(item)]),
    );
  return value;
}
/** Reduz chamadas Canvas legadas a operações geométricas do contrato, descartando strokes sem linha. */
function legacyOperations(input: unknown): unknown[] {
  return list(input).flatMap((raw) => {
    const op = record(raw);
    if (op.kind === 'fill') return [{ kind: 'clear' }];
    const path = list(op.path).map(list);
    const line = path.find((entry) => entry[0] === 'line'),
      move = path.find((entry) => entry[0] === 'move'),
      arc = path.find((entry) => entry[0] === 'arc');
    const rgb = typeof op.color === 'string' ? op.color.match(/\d+/g)?.map(Number) : undefined;
    if (line && move)
      return [
        {
          kind: 'line',
          from: { x: number(move[1]), y: number(move[2]) },
          to: { x: number(line[1]), y: number(line[2]) },
          width: number(op.width),
          color: rgb,
        },
      ];
    if (arc)
      return [
        {
          kind: 'arc',
          center: { x: number(arc[1]), y: number(arc[2]) },
          radius: number(arc[3]),
          start: number(arc[4]),
          end: number(arc[5]),
          width: number(op.width),
          color: rgb,
        },
      ];
    return [];
  });
}
const baseline: unknown = JSON.parse(
  gunzipSync(
    readFileSync(new URL('../fixtures/legacy/examples.json.gz', import.meta.url)),
  ).toString('utf8'),
);
const examples = list(baseline).map(record);

describe('porte Papert comparado aos 34 resultados originais imutáveis', () => {
  it('mantém os 80 registros de comandos originais', () => {
    expect(commandCatalog).toHaveLength(80);
  });
  it.each(examples)('preserva geometria e estado do exemplo $id', (entry) => {
    const id = entry.id;
    if (typeof id !== 'string') throw new Error('ID inválido');
    const source = readFileSync(
      new URL(`../fixtures/legacy/originals/compartilhados-code/${id}.txt`, import.meta.url),
      'utf8',
    );
    const engine = new LogoEngine();
    const result = engine.run(source);
    expect(result).toEqual({ ok: true, value: undefined });
    const capture = record(entry.result),
      snapshot = record(list(capture.snapshots)[0]);
    const operations: DrawOp[] = engine
      .takeEffects()
      .flatMap((effect) => (effect.type === 'draw' ? [...effect.operations] : []));
    expect(operations).toStrictEqual(tolerant(legacyOperations(capture.operations)));
    expect(engine.turtle.view().position).toStrictEqual(tolerant(snapshot.position));
    expect(engine.turtle.view().heading).toEqual(tolerant(snapshot.heading));
  });
});
