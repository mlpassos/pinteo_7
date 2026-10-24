/** Intervalo semiaberto de offsets UTF-16 na fonte original. */
export type Span = Readonly<{ start: number; end: number }>;

/** Falha esperada apresentada em pt-BR, com localização quando disponível. */
export type Diagnostic = Readonly<{
  code: string;
  message: string;
  span?: Span;
}>;

/** Resultado explícito: uma falha nunca contém um valor parcialmente aceito. */
export type Result<T> =
  Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; diagnostics: readonly Diagnostic[] }>;

/** Componentes RGB na ordem vermelho, verde e azul, no intervalo 0–255. */
export type RGB = readonly [number, number, number];

/** Constrói um resultado bem-sucedido sem transformar o valor recebido. */
export function succeed<T>(value: T): Result<T> {
  return { ok: true, value };
}

/** Constrói uma falha com pelo menos um diagnóstico, sem aceitar sucesso parcial. */
export function fail(first: Diagnostic, ...rest: readonly Diagnostic[]): Result<never> {
  return { ok: false, diagnostics: [first, ...rest] };
}
