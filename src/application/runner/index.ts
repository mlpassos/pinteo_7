import { fail, succeed, type Result } from '../../core/common/index.js';
import { LogoEngine, type ExecutionLimits, type LogoEffect } from '../../core/logo/index.js';
import type { Runner, RunEvent, Speed } from '../index.js';

/** Agendamento injetável para testes; callbacks nunca armazenam fonte ou estado em UI. */
export interface RunScheduler {
  /** Relógio monotônico em milissegundos. */
  now(): number;
  /** Agenda uma fatia e retorna cancelamento idempotente. */
  schedule(callback: () => void, delay: number): () => void;
}
const defaultScheduler: RunScheduler = {
  now: () => performance.now(),
  schedule: (callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => {
      clearTimeout(timer);
    };
  },
};

/** Runner cooperativo com sessão LOGO e invalidação de callbacks de execuções anteriores. */
export class LogoRunner implements Runner {
  private engine: LogoEngine;
  private execution: Generator<void, Result<void>, void> | undefined;
  private readonly listeners = new Set<(event: RunEvent) => void>();
  private cancel: (() => void) | undefined;
  private generation = 0;
  private disposed = false;
  private speed: Speed = 'normal';
  /** Injeta apenas agendador e limites; React, DOM e filesystem ficam fora. */
  constructor(
    private readonly scheduler: RunScheduler = defaultScheduler,
    private readonly limits: Partial<ExecutionLimits> = {},
  ) {
    this.engine = new LogoEngine(limits);
  }
  /** Entrega um evento ordenado para os observadores atuais. */
  private emit(event: RunEvent): void {
    for (const listener of this.listeners) listener(event);
  }
  /** Repassa efeitos do core, sem duplicar o avaliador ou suas filas. */
  private forwardEffects(effects: readonly LogoEffect[]): boolean {
    let drawn = false;
    const generation = this.generation;
    for (const effect of effects) {
      this.emit(effect);
      if (effect.type === 'draw') drawn = true;
      if (generation !== this.generation) break;
    }
    return drawn;
  }
  /** Agenda próxima fatia respeitando velocidade e geração ativa. */
  private schedule(delay: number): void {
    if (this.disposed || !this.execution) return;
    const generation = this.generation;
    this.cancel = this.scheduler.schedule(() => {
      if (generation === this.generation && !this.disposed) this.tick();
    }, delay);
  }
  /** Consome uma fatia com orçamento de tempo e passos; inclui loops sem desenho. */
  private tick(): void {
    const execution = this.execution;
    if (!execution) return;
    const generation = this.generation;
    const started = this.scheduler.now();
    const maxSteps = this.speed === 'fast' ? 1000 : this.speed === 'normal' ? 200 : 50;
    let drawn = false;
    for (let count = 0; count < maxSteps && this.scheduler.now() - started < 8; count++) {
      const step = execution.next();
      if (generation !== this.generation) return;
      drawn = this.forwardEffects(this.engine.takeEffects()) || drawn;
      if (generation !== this.generation) return;
      if (step.done) {
        this.execution = undefined;
        if (!step.value.ok) {
          this.emit({
            type: 'error',
            diagnostic: step.value.diagnostics[0] ?? {
              code: 'LOGO_RUNTIME',
              message: 'Não foi possível executar o programa.',
            },
          });
          this.emit({ type: 'state', status: 'error' });
        } else this.emit({ type: 'state', status: 'idle' });
        return;
      }
      if (drawn && this.speed !== 'fast') break;
    }
    this.schedule(drawn ? (this.speed === 'slow' ? 90 : this.speed === 'normal' ? 12 : 1) : 0);
  }
  /** Valida fonte antes de iniciar; sessão permanece ao trocar velocidade ou terminar. */
  start(source: string, speed: Speed): Result<void> {
    if (this.disposed)
      return fail({ code: 'RUNNER_DISPOSED', message: 'O executor já foi encerrado.' });
    this.stop();
    this.speed = speed;
    const prepared = this.engine.prepare(source);
    if (!prepared.ok) {
      for (const diagnostic of prepared.diagnostics) this.emit({ type: 'error', diagnostic });
      this.emit({ type: 'state', status: 'error' });
      return prepared;
    }
    this.execution = prepared.value;
    this.emit({ type: 'state', status: 'running' });
    this.schedule(0);
    return succeed(undefined);
  }
  /** Cancela avaliação e efeitos pendentes, preservando ambiente e tinta já aceitos. */
  stop(): void {
    this.generation++;
    this.cancel?.();
    this.cancel = undefined;
    this.execution?.return(succeed(undefined));
    this.execution = undefined;
    this.engine.takeEffects();
    if (!this.disposed) this.emit({ type: 'state', status: 'idle' });
  }
  /** Limpa ambiente, saída e desenho sem acessar ou alterar documento externo. */
  clear(): void {
    if (this.disposed) return;
    this.stop();
    this.engine = new LogoEngine(this.limits);
    this.emit({ type: 'clear-text' });
    this.emit({ type: 'draw', operations: [{ kind: 'clear' }], turtle: this.engine.turtle.view() });
  }
  /** Troca somente o agendamento; não recria tartaruga, símbolos ou procedimentos. */
  setSpeed(speed: Speed): void {
    this.speed = speed;
  }
  /** Assina eventos e permite cleanup sem identidade de componente. */
  subscribe(listener: (event: RunEvent) => void): () => void {
    if (this.disposed) return () => {};
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Cancela timers e assinaturas de forma idempotente. */
  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.listeners.clear();
  }
}
/** Constrói o executor de produção com agendamento cooperativo padrão. */
export function createRunner(): Runner {
  return new LogoRunner();
}
