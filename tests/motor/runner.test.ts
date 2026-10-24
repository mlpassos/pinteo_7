import { describe, expect, it } from 'vitest';
import { LogoEngine } from '../../src/core/logo/index.js';
import { LogoRunner, type RunScheduler } from '../../src/application/runner/index.js';
import type { RunEvent } from '../../src/application/index.js';

/** Agendador determinístico para verificar ordenação sem depender de tempo de máquina. */
class Scheduler implements RunScheduler {
  private clock = 0;
  private readonly tasks: { callback: () => void; cancelled: boolean; delay: number }[] = [];
  /** Expõe tempo determinístico para o orçamento das fatias. */
  now(): number {
    return this.clock;
  }
  /** Registra callback cancelável e atraso solicitado. */
  schedule(callback: () => void, delay: number): () => void {
    const task = { callback, cancelled: false, delay };
    this.tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  }
  /** Avança uma tarefa e opcionalmente simula um callback já despachado antes de cancelamento. */
  next(includeCancelled = false): void {
    const task = this.tasks.shift();
    if (!task) return;
    this.clock += task.delay;
    if (!task.cancelled || includeCancelled) task.callback();
  }
  /** Drena fila finita com teto que detecta execução infinita de teste. */
  drain(): void {
    for (let i = 0; this.tasks.length; i++) {
      if (i > 100000) throw new Error('Fila não terminou');
      this.next();
    }
  }
}
/** Coleta textos dos eventos, sem utilizar HTML ou renderer. */
function texts(events: readonly RunEvent[]): string[] {
  return events.flatMap((event) => (event.type === 'text' ? [event.text] : []));
}

describe('runner cooperativo e estado', () => {
  it.each(['slow', 'normal', 'fast'] as const)('mantém geometria e estado em %s', (speed) => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    const events: RunEvent[] = [];
    runner.subscribe((event) => events.push(event));
    expect(runner.start('make "x 7 forward 1.5 right 90 forward :x', speed)).toMatchObject({
      ok: true,
    });
    scheduler.drain();
    expect(events.at(-1)).toEqual({ type: 'state', status: 'idle' });
    const draws = events.filter((event) => event.type === 'draw');
    expect(draws.at(-1)?.turtle.position).toEqual({ x: 257, y: 248.5 });
    expect(runner.start('print :x', speed === 'slow' ? 'fast' : 'slow')).toMatchObject({
      ok: true,
    });
    scheduler.drain();
    expect(texts(events)).toEqual(['7']);
    runner.dispose();
  });
  it('muda velocidade durante execução sem reset de estado', () => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    const events: RunEvent[] = [];
    runner.subscribe((event) => events.push(event));
    runner.start('repeat 3 [forward 1]', 'slow');
    scheduler.next();
    runner.setSpeed('fast');
    scheduler.drain();
    expect(events.filter((event) => event.type === 'draw').at(-1)?.turtle.position.y).toBe(247);
  });
  it('invalida callback antigo e limpa ambiente/saída/tinta sem apagar fonte externa', () => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    const events: RunEvent[] = [];
    runner.subscribe((event) => events.push(event));
    const source = 'make "x 7 forever []';
    runner.start(source, 'fast');
    runner.stop();
    scheduler.next(true);
    expect(texts(events)).toEqual([]);
    runner.clear();
    expect(events.at(-1)).toMatchObject({
      type: 'draw',
      operations: [{ kind: 'clear' }],
      turtle: { position: { x: 250, y: 250 } },
    });
    expect(events).toContainEqual({ type: 'clear-text' });
    expect(source).toBe('make "x 7 forever []');
    runner.start('print :x', 'normal');
    scheduler.drain();
    expect(
      events.filter((event) => event.type === 'error').map((event) => event.diagnostic.code),
    ).toContain('LOGO_UNDEFINED_VARIABLE');
  });
  it('interrompe avaliação vazia e restaura escopo de procedimento quando cancela', () => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    const events: RunEvent[] = [];
    runner.subscribe((event) => events.push(event));
    runner.start('make "x 7 to inner :x forever [] end inner 20', 'fast');
    scheduler.next();
    runner.stop();
    runner.start('print :x', 'normal');
    scheduler.drain();
    expect(texts(events)).toEqual(['7']);
  });
  it('permite cancelar dentro de assinatura sem continuar avaliação antiga', () => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    const events: RunEvent[] = [];
    runner.subscribe((event) => {
      events.push(event);
      if (event.type === 'text') runner.stop();
    });
    runner.start('print 1 print 2', 'fast');
    scheduler.drain();
    expect(texts(events)).toEqual(['1']);
  });
  it('dispose cancela recursos e start posterior falha legivelmente', () => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    runner.start('forever []', 'fast');
    runner.dispose();
    runner.dispose();
    scheduler.drain();
    expect(runner.start('print 1', 'fast')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'RUNNER_DISPOSED' }],
    });
  });
});

describe('limites do mesmo avaliador síncrono/cooperativo', () => {
  it.each([
    'repeat 1000000000 []',
    'forever []',
    'while true []',
    'until false []',
    'do.while true []',
    'do.until false []',
  ])('limita laço sem desenho: %s', (source) => {
    expect(new LogoEngine({ steps: 1000 }).run(source)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_STEP_LIMIT' }],
    });
  });
  it('limita recursão e mantém ambiente consistente após falha', () => {
    const engine = new LogoEngine({ depth: 20 });
    expect(engine.run('make "x 7 to recurse recurse end recurse')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_DEPTH_LIMIT' }],
    });
    expect(engine.run('print :x')).toMatchObject({ ok: true });
  });
  it('limita desenho, saída, array enorme, alocação cumulativa, NaN e Infinity', () => {
    expect(new LogoEngine({ drawings: 2 }).run('repeat 3 [forward 1]')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_DRAW_LIMIT' }],
    });
    expect(new LogoEngine({ textBytes: 5 }).run('repeat 6 [print 1]')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_TEXT_LIMIT' }],
    });
    expect(new LogoEngine().run('make "x array 1000000000')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_LIST_LIMIT' }],
    });
    expect(new LogoEngine({ listItems: 10 }).run('repeat 4 [make "x array 3]')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_LIST_LIMIT' }],
    });
    expect(new LogoEngine().run('print divide 1 0')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_NON_FINITE' }],
    });
    expect(new LogoEngine().run('print sqrt minus 1')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_NON_FINITE' }],
    });
  });
  it('limita fonte em bytes UTF8 e mantém spans nos erros de execução', () => {
    expect(new LogoEngine().run(';🐢'.repeat(5000))).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_SOURCE_LIMIT' }],
    });
    expect(new LogoEngine().run('forward :undefined')).toMatchObject({
      ok: false,
      diagnostics: [{ span: { start: 8, end: 18 } }],
    });
  });
  it('aplica limite de sessão entre execuções para não acumular arrays indefinidamente', () => {
    const engine = new LogoEngine({ listItems: 5 });
    expect(engine.run('make "x array 3')).toMatchObject({ ok: true });
    expect(engine.run('make "y array 3')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'LOGO_LIST_LIMIT' }],
    });
  });
});

describe('cancelamento reentrante na entrega de desenho', () => {
  it('não entrega snapshot antigo depois de Limpar dentro de um observador', () => {
    const scheduler = new Scheduler(),
      runner = new LogoRunner(scheduler);
    const events: RunEvent[] = [];
    let cleared = false;
    runner.subscribe((event) => {
      events.push(event);
      if (
        !cleared &&
        event.type === 'draw' &&
        event.operations.some((operation) => operation.kind === 'line')
      ) {
        cleared = true;
        runner.clear();
      }
    });
    runner.start('forward 10', 'fast');
    scheduler.drain();
    expect(events.filter((event) => event.type === 'draw').at(-1)).toMatchObject({
      operations: [{ kind: 'clear' }],
      turtle: { position: { x: 250, y: 250 } },
    });
  });
});
