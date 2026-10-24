import { describe, expect, it } from 'vitest';
import {
  LogoEngine,
  parseLogo,
  commandCatalog,
  resolveCommand,
} from '../../src/core/logo/index.js';
import { runLegacy } from '../../scripts/legacy/harness.mjs';

/** Reconstrói somente a saída textual para comparar com HTML bruto do harness antigo. */
function output(source: string, engine = new LogoEngine()): string {
  const result = engine.run(source);
  expect(result).toEqual({ ok: true, value: undefined });
  let html = '';
  for (const effect of engine.takeEffects()) {
    if (effect.type === 'text') html += `<div>${effect.text}</div>`;
    if (effect.type === 'clear-text') html = '';
  }
  return html;
}

const compatibleCases = [
  'print [1 2 3] print first [4 5] print butfirst [4 5 6] print butlast [7 8] print item 1 [10 20] print empty? []',
  'print fput [1 2] [3 4] print lput [1 2] [3 4] print fput "a "b print lput "a "b',
  '(print 1 2) print (sum 1 2 3) print (product 2 3 4) print (1 + 2)',
  'make "x 10 to inner print :x end to outer :x inner make "x 20 inner end outer 7 print :x',
  'to double :n output product :n 2 end print double 7',
  'to count :n if :n = 0 [stop] print :n count difference :n 1 end count 3',
  'make "x 0 repeat 3 [make "x sum :x 1] if :x = 3 [print :x] ifelse :x > 10 [print 100] [print 200]',
  'make "x 0 while :x < 3 [make "x sum :x 1] print :x until :x = 5 [make "x sum :x 1] print :x',
  'print round 2.8 print int 2.8 print sqrt 9 print power 2 3 print exp 0 print ln 1 print log10 100',
  'print sin 30 print cos 60 print arctan 1 print radsin 0 print radcos 0 print radarctan 0',
  'print bitor 3 4 print bitnot 1 print modulo 7 3 print minus 4 print equal? 1 true print notequal? 1 false',
  'print or false true print and true false print not false print first "word print butlast "word',
  'print less? "abc "b print greater? [2] [1] print lessequal? true 2 print greaterequal? "a 2',
  'make "a [1 2] setitem 1 :a 7 print :a print divide 12 4 print difference 4 3',
  'rerandom 12345 print random 100 print rand 100 srand 12345 print random 100',
];

describe('semântica CLI comparada ao Papert real além dos desenhos', () => {
  it.each(compatibleCases)('preserva %s', (source) => {
    const expected = output(source);
    expect(runLegacy([{ kind: 'run', source }])).toMatchObject({
      snapshots: [{ output: expected, error: null }],
      exceptions: [],
    });
  });
  it('preserva procedimentos parametrizados em novas execuções na mesma sessão', () => {
    const engine = new LogoEngine();
    output('to double :n output product :n 2 end', engine);
    expect(output('print double 7', engine)).toBe('<div>14</div>');
    expect(
      runLegacy([
        { kind: 'run', source: 'to double :n output product :n 2 end' },
        { kind: 'run', source: 'print double 7' },
      ]),
    ).toMatchObject({ snapshots: [{ error: null }, { output: '<div>14</div>', error: null }] });
  });
  it('preserva associação de listas e precedência do resto antes de multiplicação', () => {
    expect(output('print 2 * 7 % 3 print 12 / 3 / 2')).toBe('<div>2</div><div>2</div>');
  });
  it('preserva todos os aliases não corrigidos do catálogo', () => {
    for (const command of commandCatalog) {
      for (const alias of command.aliases) expect(resolveCommand(alias)?.name).toBe(command.name);
    }
  });
});

describe('correções explícitas de bugs caracterizados', () => {
  it('respeita parênteses seguidos de infixo, corrigindo a omissão legada', () => {
    expect(output('print (1 + 2) * 3')).toBe('<div>9</div>');
    expect(runLegacy([{ kind: 'run', source: 'print (1 + 2) * 3' }])).toMatchObject({
      snapshots: [{ output: '<div>3</div>' }],
    });
  });
  it('corrige last, bitxor, bitand e alias de comparação', () => {
    expect(
      output(
        'print last [1 2 3] print bitxor 3 1 print bitand 6 2 print greaterequalp 3 2 print lessequalp 3 2',
      ),
    ).toBe('<div>3</div><div>2</div><div>2</div><div>true</div><div>false</div>');
  });
  it('permite nomes iniciados por to/end e controles do.while/do.until registrados', () => {
    expect(
      output('make "total 1 to total print :total end total to endereco print 2 end endereco'),
    ).toBe('<div>1</div><div>2</div>');
    expect(
      output(
        'make "x 0 do.while :x < 2 [make "x sum :x 1] print :x do.until :x = 4 [make "x sum :x 1] print :x',
      ),
    ).toBe('<div>2</div><div>4</div>');
  });
  it('limpa tinta com clean sem alterar a posição', () => {
    const engine = new LogoEngine();
    expect(engine.run('forward 10 clean')).toMatchObject({ ok: true });
    expect(engine.turtle.view().position.y).toBe(240);
    expect(
      engine.takeEffects().flatMap((effect) => (effect.type === 'draw' ? effect.operations : [])),
    ).toContainEqual({ kind: 'clear' });
  });
  it('diagnostica variável indefinida sem recriar ambiente após erro', () => {
    const engine = new LogoEngine();
    output('make "x 7', engine);
    expect(engine.run('print :missing')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_UNDEFINED_VARIABLE' }],
    });
    expect(output('print :x', engine)).toBe('<div>7</div>');
  });
});

describe('parser puro e posições usadas pelo conversor', () => {
  it('conserva texto, comentários CRLF, aliases e intervalos UTF16 sem executar make', () => {
    const source = '; ação 🐢\r\nfw sum 2 3 ; fim\r\nmake "x 7';
    const parsed = parseLogo(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('Parser falhou');
    expect(parsed.value.source).toBe(source);
    expect(
      parsed.value.comments.map((comment) => source.slice(comment.span.start, comment.span.end)),
    ).toEqual(['; ação 🐢', '; fim']);
    expect(parsed.value.body[0]).toMatchObject({
      kind: 'call',
      name: 'fw',
      args: [
        {
          kind: 'call',
          name: 'sum',
          args: [
            { kind: 'number', value: 2 },
            { kind: 'number', value: 3 },
          ],
        },
      ],
    });
    for (const node of parsed.value.body)
      expect(source.slice(node.span.start, node.span.end)).not.toBe('');
  });
  it.each([
    'repeat 3 [forward 2',
    'forward',
    'to demo forward 1',
    '[',
    'to outer to inner end end',
    '@',
  ])('recusa sintaxe incompleta ou inválida: %s', (source) => {
    expect(parseLogo(source)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_SYNTAX' }],
    });
  });
  it('não perde diagnóstico de excesso de profundidade/entrada', () => {
    expect(parseLogo('['.repeat(250) + ']'.repeat(250))).toMatchObject({ ok: false });
    expect(parseLogo(';'.repeat(20481))).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_SOURCE_LIMIT' }],
    });
  });
});

describe('fronteiras semânticas adicionais', () => {
  it('preserva chamada parametrizada definida depois do corpo chamador', () => {
    const source = 'to firstproc secondproc 7 end to secondproc :n print :n end firstproc';
    expect(output(source)).toBe('<div>7</div>');
    expect(runLegacy([{ kind: 'run', source }])).toMatchObject({
      snapshots: [{ output: '<div>7</div>', error: null }],
    });
  });
  it('preserva promoção global do escopo dinâmico e lista alterada por referência', () => {
    const source =
      'make "x 1 make "list [1 2] to change global "x make "x 2 setitem 0 :list 7 end change print :x print :list';
    expect(output(source)).toBe('<div>2</div><div>7 2 </div>');
    expect(runLegacy([{ kind: 'run', source }])).toMatchObject({
      snapshots: [{ output: '<div>2</div><div>7 2 </div>', error: null }],
    });
  });
  it('array inicializa zeros e aceita índices zero; negativos em campos numéricos são literais', () => {
    expect(output('print array 3 print -2')).toBe('<div>0 0 0 </div><div>-2</div>');
    const engine = new LogoEngine();
    expect(engine.run('setxy -5 7 forward -1.5')).toMatchObject({ ok: true });
    expect(engine.turtle.view().position).toEqual({ x: -5, y: 8.5 });
  });
  it('rejeita definições também dentro de listas internas de outro procedimento', () => {
    expect(parseLogo('to outer repeat 1 [to inner forward 1 end] end')).toMatchObject({
      ok: false,
    });
  });
  it('valida intervalos de cor, raio, largura, lista e números excessivos', () => {
    for (const source of [
      'color [256 0 0]',
      'circle -1',
      'penwidth 0',
      'setxy 1.5 2',
      'setpos [1]',
      'color [1 2]',
      'setitem -1 [1] 2',
    ])
      expect(new LogoEngine().run(source)).toMatchObject({ ok: false });
    expect(parseLogo('9'.repeat(400))).toMatchObject({ ok: false });
  });
  it('interrompe impressão exponencial antes de construir a saída inteira e lida com ciclo', () => {
    const engine = new LogoEngine();
    expect(engine.run('make "x [1] repeat 30 [make "x fput :x fput :x []] print :x')).toMatchObject(
      { ok: false, diagnostics: [{ code: 'LOGO_TEXT_LIMIT' }] },
    );
    expect(output('make "x [1] setitem 0 :x :x print :x')).toBe('<div> </div>');
  });
  it('limita também o log geométrico acumulado entre execuções até limpar', () => {
    const engine = new LogoEngine({ drawings: 2 });
    expect(engine.run('forward 1 forward 1')).toMatchObject({ ok: true });
    expect(engine.run('forward 1')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_DRAW_LIMIT' }],
    });
    expect(engine.run('reset forward 1')).toMatchObject({ ok: true });
  });
});

describe('regressões da revisão técnica independente', () => {
  it('lput em palavra limita coerção de lista compartilhada antes de expansão nativa', () => {
    const engine = new LogoEngine();
    expect(
      engine.run('make "a [1] repeat 27 [make "a fput :a :a] make "b lput :a "x'),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'LOGO_VALUE_LIMIT' }] });
  });
  it.each(['butfirst', 'butlast'])('reserva cópia de %s no orçamento de sessão', (command) => {
    const engine = new LogoEngine({ listItems: 10 });
    expect(engine.run(`make "a array 10 make "b ${command} :a`)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_LIST_LIMIT' }],
    });
  });
  it('resolve aridade tardia de procedimento em outra execução e conserva spans', () => {
    const engine = new LogoEngine();
    expect(engine.run('to caller callee 7 end')).toMatchObject({ ok: true });
    expect(output('to callee :x print :x end caller', engine)).toBe('<div>7</div>');
    expect(
      runLegacy([
        { kind: 'run', source: 'to caller callee 7 end' },
        { kind: 'run', source: 'to callee :x print :x end caller' },
      ]),
    ).toMatchObject({ snapshots: [{ error: null }, { output: '<div>7</div>', error: null }] });
    expect(engine.run('to fail print :undefined end')).toMatchObject({ ok: true });
    expect(engine.run('fail')).toMatchObject({
      ok: false,
      diagnostics: [{ span: { start: 14, end: 24 } }],
    });
  });
  it('não emite geometria não finita quando duas distâncias finitas estouram a posição', () => {
    const huge = '1' + '0'.repeat(308);
    const engine = new LogoEngine();
    expect(engine.run(`setheading 90 forward ${huge} forward ${huge}`)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_RANGE' }],
    });
    const serialized = JSON.stringify(engine.takeEffects());
    expect(serialized).not.toContain('null');
    expect(Number.isFinite(engine.turtle.view().position.x)).toBe(true);
    expect(Number.isFinite(engine.turtle.view().position.y)).toBe(true);
  });
});

describe('geometria e comandos de tartaruga fora dos 34 exemplos', () => {
  it('mantém posição absoluta, heading, caneta, arco e undo/redo inertes do legado', () => {
    const source =
      'setxy 20 30 setheading 90 color [1 2 3] penwidth 2 forward 10 arc 5 90 left 90 backward 5 penup forward 1 pendown hideturtle showturtle undo redo';
    const engine = new LogoEngine();
    expect(engine.run(source)).toMatchObject({ ok: true });
    expect(engine.turtle.view()).toEqual({
      position: { x: 30, y: 34 },
      heading: -90,
      visible: true,
    });
    const operations = engine
      .takeEffects()
      .flatMap((effect) => (effect.type === 'draw' ? effect.operations : []));
    expect(operations).toEqual([
      { kind: 'line', from: { x: 20, y: 30 }, to: { x: 30, y: 30 }, width: 2, color: [1, 2, 3] },
      {
        kind: 'arc',
        center: { x: 30, y: 30 },
        radius: 5,
        start: 0,
        end: Math.PI / 2,
        width: 2,
        color: [1, 2, 3],
      },
      { kind: 'line', from: { x: 30, y: 30 }, to: { x: 30, y: 35 }, width: 2, color: [1, 2, 3] },
    ]);
    expect(runLegacy([{ kind: 'run', source }])).toMatchObject({
      snapshots: [{ position: { x: 30, y: 34 }, heading: -90, error: null }],
      exceptions: [],
    });
  });
  it('distingue home, clearscreen, reset e saída cleartext', () => {
    const engine = new LogoEngine();
    expect(engine.run('setx 100 sety 200 home setpos [20 30] cleartext clearscreen')).toMatchObject(
      { ok: true },
    );
    expect(engine.turtle.view().position).toEqual({ x: 250, y: 250 });
    expect(engine.takeEffects()).toContainEqual({ type: 'clear-text' });
    expect(engine.run('penup color [1 2 3] reset forward 1')).toMatchObject({ ok: true });
    expect(
      engine.takeEffects().flatMap((effect) => (effect.type === 'draw' ? effect.operations : [])),
    ).toContainEqual({
      kind: 'line',
      from: { x: 250, y: 250 },
      to: { x: 250, y: 249 },
      width: 1,
      color: [0, 0, 0],
    });
  });
});

describe('compatibilidade de nomes Papert com ponto inicial', () => {
  it('preserva procedimento .forma sem alterar a gramática de variável/símbolo', () => {
    const source = 'to .forma print 7 end .forma';
    expect(output(source)).toBe('<div>7</div>');
    expect(runLegacy([{ kind: 'run', source }])).toMatchObject({
      snapshots: [{ output: '<div>7</div>', error: null }],
    });
    expect(parseLogo('make ".nome 1')).toMatchObject({ ok: false });
    expect(parseLogo('print :.nome')).toMatchObject({ ok: false });
  });
});
