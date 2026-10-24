import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { runLegacy } from '../../scripts/legacy/harness.mjs';
import { fixtureRoot, inventory, root, sha256 } from '../../scripts/legacy/inventory.mjs';

/** Carrega JSON como dado não confiável, sem fazer coerção para um contrato inventado. */
function readJson(path: string): unknown {
  const bytes = readFileSync(path);
  const text = path.endsWith('.gz') ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8');
  return JSON.parse(text) as unknown;
}

/** Exige o envelope mínimo para comparar as capturas históricas. */
function readExamples(): { id: string; result: unknown }[] {
  const input = readJson(`${fixtureRoot}examples.json.gz`);
  if (!Array.isArray(input)) throw new Error('Fixtures inválidas');
  return input.map((entry: unknown) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('id' in entry) ||
      typeof entry.id !== 'string' ||
      !('result' in entry)
    ) {
      throw new Error('Exemplo inválido');
    }
    return { id: entry.id, result: entry.result };
  });
}

/** Reconhece objetos JSON antes de ler propriedades de uma fixture externa. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Converte somente números finitos em comparação absoluta subpixel (<5e-10).
 * Estrutura, ordem, strings, chaves e demais tipos continuam sujeitos a toStrictEqual.
 */
function withSubpixelTolerance(value: unknown): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Número não finito na baseline');
    return expect.closeTo(value, 9);
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item: unknown) => withSubpixelTolerance(item));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, withSubpixelTolerance(item)]),
    );
  }
  throw new Error('Valor não JSON na baseline');
}

const examples = readExamples();

describe('patrimônio e Papert real', () => {
  it('preserva os 34 trios e os 21 personagens com seus bytes originais', () => {
    const current = inventory();
    expect(current).toEqual(readJson(`${fixtureRoot}manifest.json`));
    expect(current.examples).toHaveLength(34);
    expect(current.characters).toHaveLength(21);
    for (const file of [
      ...current.examples.flatMap((example) => example.files),
      ...current.characters,
      ...current.engine,
    ]) {
      const bytes = readFileSync(`${fixtureRoot}originals/${file.path}`);
      expect(bytes.length, file.path).toBe(file.bytes);
      expect(sha256(bytes), file.path).toBe(file.sha256);
    }
  });

  it('não deixa arquivos PNG/CP7 órfãos fora dos 34 conjuntos', () => {
    const ids = inventory()
      .examples.map((example) => example.id)
      .sort();
    for (const [directory, extension] of [
      ['compartilhados', '.png'],
      ['compartilhados-code', '.cp7'],
    ] as const) {
      const actual = readdirSync(`${root}${directory}`)
        .filter((name) => name.endsWith(extension))
        .map((name) => name.slice(0, -extension.length))
        .sort();
      expect(actual).toEqual(ids);
    }
  });

  it('preserva os 21 personagens em PNG 128×128 com canal alpha', () => {
    for (const file of inventory().characters) {
      const bytes = readFileSync(`${fixtureRoot}originals/${file.path}`);
      expect(bytes.subarray(0, 8).toString('hex'), file.path).toBe('89504e470d0a1a0a');
      expect(bytes.subarray(12, 16).toString('ascii'), file.path).toBe('IHDR');
      expect(bytes.readUInt32BE(16), file.path).toBe(128);
      expect(bytes.readUInt32BE(20), file.path).toBe(128);
      expect(bytes[25], file.path).toBe(6);
    }
  });

  it.each(examples)('reproduz desenho, saída, erros e tartaruga de $id', ({ id, result }) => {
    const source = readFileSync(`${root}compartilhados-code/${id}.txt`, 'utf8');
    expect(runLegacy([{ kind: 'run', source }], 5000)).toStrictEqual(withSubpixelTolerance(result));
  });

  it('interrompe efetivamente loop síncrono sem desenho no timeout da VM', () => {
    const start = performance.now();
    expect(() => runLegacy([{ kind: 'run', source: 'repeat 1000000000 [make "x 1]' }], 30)).toThrow(
      /timed out/,
    );
    expect(performance.now() - start).toBeLessThan(2000);
    expect(runLegacy([{ kind: 'run', source: 'print 7' }])).toMatchObject({
      snapshots: [{ output: '<div>7</div>', error: null }],
    });
  });

  it('recusa ações/velocidades/limites inválidos na fronteira', () => {
    expect(() => runLegacy([{ kind: 'run', source: 3 }])).toThrow('Fonte inválida');
    expect(() => runLegacy([{ kind: 'run', source: '', speed: 300 }])).toThrow(
      'Velocidade inválida',
    );
    expect(() => runLegacy([], 0)).toThrow('Timeout inválido');
  });
});

describe('comparação numérica portátil da baseline', () => {
  const baseline = {
    operations: [{ path: [22.171488964922183, 60.47371112087105], kind: 'line' }],
    snapshots: [{ operations: 1, output: 'texto' }],
  };

  it('aceita somente ruído subpixel das operações trigonométricas entre arquiteturas', () => {
    expect({
      operations: [{ path: [22.17148896492219, 60.47371112087106], kind: 'line' }],
      snapshots: [{ operations: 1, output: 'texto' }],
    }).toStrictEqual(withSubpixelTolerance(baseline));
  });

  it('recusa diferenças geométricas acima de 1e-9', () => {
    expect(() => {
      expect({
        ...baseline,
        operations: [{ path: [22.171488964922183 + 2e-9, 60.47371112087105], kind: 'line' }],
      }).toStrictEqual(withSubpixelTolerance(baseline));
    }).toThrow();
  });

  it('recusa mudanças de contador, texto, ordem, tipo, comprimento ou chaves', () => {
    const variants: unknown[] = [
      { ...baseline, snapshots: [{ operations: 2, output: 'texto' }] },
      { ...baseline, snapshots: [{ operations: 1, output: 'outro texto' }] },
      {
        ...baseline,
        operations: [{ path: [60.47371112087105, 22.171488964922183], kind: 'line' }],
      },
      {
        ...baseline,
        operations: [{ path: ['22.171488964922183', 60.47371112087105], kind: 'line' }],
      },
      { ...baseline, operations: [] },
      { ...baseline, extra: undefined },
      { operations: baseline.operations },
    ];
    for (const variant of variants) {
      expect(() => {
        expect(variant).toStrictEqual(withSubpixelTolerance(baseline));
      }).toThrow();
    }
  });

  it('recusa valores externos que não são JSON numérico finito', () => {
    expect(() => withSubpixelTolerance(Number.NaN)).toThrow('Número não finito');
    expect(() => withSubpixelTolerance(undefined)).toThrow('Valor não JSON');
  });
});

describe('bugs históricos observados, sem corrigi-los nesta etapa', () => {
  it('last retorna undefined e print last lança TypeError', () => {
    expect(runLegacy([{ kind: 'run', source: 'print last [1 2 3]' }])).toMatchObject({
      exceptions: ["TypeError: Cannot read properties of undefined (reading 'constructor')"],
      snapshots: [{ output: '', error: null }],
    });
  });

  it('bitxor usa OR: 3 xor 1 resulta em 3 no legado', () => {
    expect(runLegacy([{ kind: 'run', source: 'print bitxor 3 1' }])).toMatchObject({
      snapshots: [{ output: '<div>3</div>' }],
    });
  });

  it('alias greaterequalp foi sobrescrito por lessequal? e lessequalp inexiste', () => {
    expect(
      runLegacy([
        {
          kind: 'run',
          source:
            'print greaterequal? 3 2 print greaterequalp 3 2 print lessequal? 3 2 print lessequalp 3 2',
        },
      ]),
    ).toMatchObject({
      snapshots: [
        {
          output: '<div>true</div><div>false</div><div>false</div>',
          error: 'Oops, eu não sei como lessequalp',
        },
      ],
    });
  });

  it('as formas infixas das comparações continuam distintas dos aliases quebrados', () => {
    expect(
      runLegacy([
        {
          kind: 'run',
          source: 'print 3 >= 2 print 3 <= 2 print 2 < 3 print 3 > 2 print 3 = 3 print 3 != 2',
        },
      ]),
    ).toMatchObject({
      snapshots: [
        {
          output:
            '<div>true</div><div>false</div><div>true</div><div>true</div><div>true</div><div>true</div>',
          error: null,
        },
      ],
    });
  });
});

describe('ponte init.js e estado de sessão', () => {
  it('mantém variáveis, procedimentos, desenho e posição entre execuções na mesma velocidade', () => {
    expect(
      runLegacy([
        { kind: 'run', source: 'make "x 7 to lado forward :x end lado print :x' },
        { kind: 'run', source: 'lado print :x' },
      ]),
    ).toMatchObject({
      snapshots: [
        { position: { x: 250, y: 243 }, output: '<div>7</div>', operations: 1 },
        {
          position: { x: 250, y: 236 },
          output: '<div>7</div><div>7</div>',
          operations: 2,
          error: null,
        },
      ],
    });
  });

  it('troca de velocidade recria a tartaruga no centro, preservando ambiente LOGO e tinta anterior', () => {
    expect(
      runLegacy([
        { kind: 'run', source: 'make "x 7 forward 10 color [1 2 3] penup' },
        { kind: 'run', source: 'forward :x print :x', speed: 1 },
      ]),
    ).toMatchObject({
      snapshots: [
        { position: { x: 250, y: 240 }, pen: false },
        {
          position: { x: 250, y: 243 },
          pen: true,
          color: 'rgb(0,0,0)',
          output: '<div>7</div>',
          operations: 2,
        },
      ],
    });
  });

  it('lento segmenta o desenho e mostra personagem; normal/rápido preservam geometria integral', () => {
    for (const speed of [1, 5, 25]) {
      expect(runLegacy([{ kind: 'run', source: 'forward 10', speed }])).toMatchObject({
        snapshots: [
          {
            position: { x: 250, y: 240 },
            visible: speed === 25,
            operations: speed === 25 ? 10 : 1,
          },
        ],
      });
    }
    expect(runLegacy([{ kind: 'run', source: 'forward 1.5', speed: 25 }])).toMatchObject({
      snapshots: [{ position: { x: 250, y: 248 }, operations: 2 }],
    });
    expect(runLegacy([{ kind: 'run', source: 'forward 1.5', speed: 5 }])).toMatchObject({
      snapshots: [{ position: { x: 250, y: 248.5 }, operations: 1 }],
    });
  });

  it('clearcanvas apaga imagem/saída e conserva variáveis, posição e histórico', () => {
    expect(
      runLegacy([
        { kind: 'run', source: 'make "x 7 forward 10 print :x' },
        { kind: 'clear' },
        { kind: 'run', source: 'print :x' },
      ]),
    ).toMatchObject({
      snapshots: [
        { position: { x: 250, y: 240 }, output: '<div>7</div>' },
        {
          position: { x: 250, y: 240 },
          output: '',
          history: '\nmake "x 7 forward 10 print :x',
          operations: 2,
        },
        { position: { x: 250, y: 240 }, output: '<div>7</div>', error: null },
      ],
    });
  });

  it('reset LOGO apaga tinta/reinicia tartaruga e mantém variáveis/saída', () => {
    expect(
      runLegacy([
        { kind: 'run', source: 'make "x 7 forward 10 color [1 2 3] penup print :x' },
        { kind: 'run', source: 'reset print :x' },
      ]),
    ).toMatchObject({
      snapshots: [
        { pen: false },
        {
          position: { x: 250, y: 250 },
          heading: 270,
          color: 'rgb(0,0,0)',
          pen: true,
          output: '<div>7</div><div>7</div>',
        },
      ],
    });
  });

  it('setup recria ambiente e erro de execução também perde variáveis anteriores', () => {
    expect(
      runLegacy([
        { kind: 'run', source: 'make "x 7' },
        { kind: 'setup' },
        { kind: 'run', source: 'forward :x' },
      ]),
    ).toMatchObject({
      snapshots: [
        { error: null },
        { error: null },
        { error: 'Forward precisa de um número, não undefined' },
      ],
    });
    expect(
      runLegacy([
        { kind: 'run', source: 'make "x 7' },
        { kind: 'run', source: 'comandoinexistente' },
        { kind: 'run', source: 'forward :x' },
      ]),
    ).toMatchObject({
      snapshots: [
        { error: null },
        { error: 'Oops, eu não sei como comandoinexistente' },
        { error: 'Forward precisa de um número, não undefined' },
      ],
    });
  });

  it('Parar cancela fila; reset enfileirado não é executado após halt', () => {
    expect(
      runLegacy([
        { kind: 'run', source: 'forward 10 right 90 forward 20', drain: false },
        { kind: 'stop' },
        { kind: 'drain' },
      ]),
    ).toMatchObject({
      snapshots: [
        { position: { x: 250, y: 250 }, pending: 3, scheduled: 1 },
        { position: { x: 250, y: 250 }, pending: 4 },
        { position: { x: 250, y: 250 }, pending: 4, operations: 0, scheduled: 0 },
      ],
    });
  });
});
