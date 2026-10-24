// Derivado do interpretador Papert de Thomas Figg e colaboradores, sob MIT.
import { fail, succeed, type Diagnostic, type Result } from '../common/index.js';
import { Turtle, type DrawOp, type TurtleView } from '../turtle/index.js';
import { infixCatalog, resolveCommand } from './catalog.js';
import { utf8Length } from './parser.js';
import { parseLogo, type LogoNode, type ParsedLogo } from './parser.js';

/** Valores LOGO preservam listas mutáveis e escopo dinâmico dos procedimentos Papert. */
export type LogoValue = number | string | boolean | LogoValue[] | undefined | null;
/** Limites por execução, configuráveis para testes e cenários de escola. */
export type ExecutionLimits = Readonly<{
  steps: number;
  drawings: number;
  textBytes: number;
  depth: number;
  listItems: number;
}>;
/** Orçamentos iniciais definidos pela arquitetura, sem cortar os exemplos preservados. */
export const defaultExecutionLimits: ExecutionLimits = {
  steps: 100000,
  drawings: 100000,
  textBytes: 20480,
  depth: 200,
  listItems: 100000,
};
type Definition = Extract<LogoNode, { kind: 'define' }>;
type DefinitionEntry = {
  node: Definition;
  source: string;
  cache?: { revision: number; body: readonly LogoNode[] };
};
type TextBudget = { bytes: number; limit: number; code: string; message: string };
/** Saída pública do motor puro, interpretada pelo runner sem dependência de DOM. */
export type LogoEffect =
  | Readonly<{ type: 'draw'; operations: readonly DrawOp[]; turtle: TurtleView }>
  | Readonly<{ type: 'text'; text: string }>
  | Readonly<{ type: 'clear-text' }>;
/** Falha esperada do avaliador com localização opcional. */
class RuntimeFailure extends Error {
  /** Guarda diagnóstico tipado até a fronteira de execução. */
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
  }
}
/** Sinal de controle de procedimento, distinto de valores de programa. */
class ProcedureReturn extends Error {
  /** Conserva o valor de output ou stop até o quadro chamador. */
  constructor(readonly value: LogoValue) {
    super('Retorno de procedimento');
  }
}
/** Tabela de símbolos com escopo dinâmico e promoção global explícita. */
class Scope {
  private readonly values = new Map<string, LogoValue>();
  private readonly globals = new Set<string>();
  /** Registra o escopo pai de uma chamada de procedimento. */
  constructor(private readonly parent?: Scope) {}
  /** Consulta símbolo local ou herdado. */
  get(name: string): LogoValue {
    return this.globals.has(name)
      ? this.root().values.get(name)
      : this.values.has(name)
        ? this.values.get(name)
        : this.parent?.get(name);
  }
  /** Escreve no escopo atual, exceto símbolos declarados globais. */
  set(name: string, value: LogoValue): void {
    const target = this.globals.has(name) ? this.root() : this;
    if (!target.values.has(name) && target.values.size >= 2048)
      throw new RuntimeFailure({
        code: 'LOGO_SYMBOL_LIMIT',
        message: 'O ambiente excedeu o limite de nomes.',
      });
    target.values.set(name, value);
  }

  /** Marca nome para acesso no ambiente global. */
  global(name: string): void {
    this.globals.add(name);
  }
  /** Localiza ambiente raiz sem recorrer ao DOM ou ao runner. */
  private root(): Scope {
    return this.parent?.root() ?? this;
  }
}

/** Motor puro com sessão persistente; avaliador único usado no caminho síncrono. */
export class LogoEngine {
  private readonly definitions = new Map<string, DefinitionEntry>();
  private scope = new Scope();
  private seed = 12345;
  private depth = 0;
  private definitionRevision = 0;
  private activeSource = '';
  private steps = 0;
  private drawings = 0;
  private sessionDrawings = 0;
  private textBytes = 0;
  private allocatedItems = 0;
  private readonly limits: ExecutionLimits;
  private readonly effects: LogoEffect[] = [];
  readonly turtle: Turtle;
  /** Cria a tartaruga de sessão e captura operações na ordem de execução. */
  constructor(limits: Partial<ExecutionLimits> = {}) {
    this.limits = { ...defaultExecutionLimits, ...limits };
    if (
      Object.values(this.limits).some(
        (value) => !Number.isSafeInteger(value) || value < 1 || value > 10000000,
      )
    )
      throw new Error('Limites inválidos.');
    this.turtle = new Turtle((operation) => {
      if (operation.kind === 'clear') this.sessionDrawings = 0;
      else this.sessionDrawings++;
      if (++this.drawings > this.limits.drawings || this.sessionDrawings > this.limits.drawings)
        throw new RuntimeFailure({
          code: 'LOGO_DRAW_LIMIT',
          message: 'O programa excedeu o limite de desenho.',
        });
      this.effects.push({ type: 'draw', operations: [operation], turtle: this.turtle.view() });
    });
  }
  /** Fixa a semente reproduzível do gerador Papert original. */
  srand(seed: number): void {
    this.seed = seed;
  }
  /** Gera o próximo número pseudoaleatório com o algoritmo original. */
  private random(): number {
    this.seed = (this.seed * 214013 + 2531011) % 4294967296;
    return ((this.seed >> 16) & 0x7fff) / 32768;
  }
  /** Retira efeitos produzidos sem expor a fila mutável interna. */
  takeEffects(): LogoEffect[] {
    return this.effects.splice(0);
  }
  /** Cria erro de execução em pt-BR apontando o nó responsável. */
  private error(node: LogoNode, message: string, code = 'LOGO_RUNTIME'): never {
    throw new RuntimeFailure({ code, message, span: node.span });
  }
  /** Exige número válido para operação matemática ou geométrica. */
  private numeric(value: LogoValue, node: LogoNode): number {
    if (typeof value !== 'number' || !Number.isFinite(value))
      return this.error(node, 'Este comando precisa de um número finito.');
    return value;
  }
  /** Exige lista ou palavra para primitivas de manipulação sequencial. */
  private sequenceValue(value: LogoValue, node: LogoNode): LogoValue[] | string {
    if (typeof value === 'string' || Array.isArray(value)) return value;
    return this.error(node, 'Este comando precisa de uma lista ou palavra.');
  }
  /** Analisa com as assinaturas da sessão e prepara o único avaliador cooperativo. */
  prepare(source: string): Result<Generator<void, Result<void>, void>> {
    const parsed = parseLogo(
      source,
      new Map(
        [...this.definitions].map(([name, definition]) => [
          name,
          definition.node.parameters.length,
        ]),
      ),
    );
    if (!parsed.ok) return parsed;
    return succeed(this.execute(parsed.value));
  }
  /** Drena o mesmo avaliador cooperativo para testes determinísticos e CLI interna. */
  run(source: string): Result<void> {
    const execution = this.prepare(source);
    if (!execution.ok) return execution;
    for (;;) {
      const step = execution.value.next();
      if (step.done) return step.value;
    }
  }
  /** Avalia AST com limites e restaura escopo mesmo quando o consumidor cancela o generator. */
  *execute(program: ParsedLogo): Generator<void, Result<void>, void> {
    this.activeSource = program.source;
    this.steps = 0;
    this.drawings = 0;
    this.textBytes = 0;
    try {
      for (const node of program.body) yield* this.evaluate(node);
      return succeed(undefined);
    } catch (error) {
      if (error instanceof RuntimeFailure) return fail(error.diagnostic);
      if (error instanceof ProcedureReturn) return succeed(undefined);
      if (error instanceof RangeError)
        return fail({
          code: 'LOGO_RANGE',
          message: 'O programa produziu um valor fora dos limites.',
        });
      throw error;
    }
  }
  /** Limita alocação cumulativa de itens por sessão para não crescer entre execuções. */
  private reserveItems(count: number, node: LogoNode): void {
    if (this.allocatedItems + count > this.limits.listItems)
      this.error(
        node,
        'A sessão excedeu o limite de itens de listas. Use Limpar para reiniciar.',
        'LOGO_LIST_LIMIT',
      );
    this.allocatedItems += count;
  }
  /** Avalia argumentos e corpos na ordem original, cedendo em cada nó. */
  private *evaluateList(nodes: readonly LogoNode[]): Generator<void, LogoValue[], void> {
    const values: LogoValue[] = [];
    for (const node of nodes) values.push(yield* this.evaluate(node));
    return values;
  }
  /** Avalia um nó Papert por despacho tipado e escopo dinâmico. */
  private *evaluate(node: LogoNode): Generator<void, LogoValue, void> {
    if (++this.steps > this.limits.steps)
      return this.error(node, 'O programa excedeu o limite de passos.', 'LOGO_STEP_LIMIT');
    yield;
    switch (node.kind) {
      case 'number':
        return node.value;
      case 'symbol':
        return node.name;
      case 'variable': {
        const value = this.scope.get(node.name);
        if (value === undefined)
          return this.error(
            node,
            `A variável ${node.name} não foi definida.`,
            'LOGO_UNDEFINED_VARIABLE',
          );
        return value;
      }
      case 'list':
        this.reserveItems(node.items.length, node);
        return yield* this.evaluateList(node.items);
      case 'define':
        if (!this.definitions.has(node.name) && this.definitions.size >= 256)
          return this.error(
            node,
            'A sessão excedeu o limite de procedimentos.',
            'LOGO_SYMBOL_LIMIT',
          );
        this.definitions.set(node.name, { node, source: this.activeSource });
        this.definitionRevision++;
        return undefined;
      case 'call': {
        const value = yield* this.call(node);
        if (typeof value === 'number' && !Number.isFinite(value))
          return this.error(node, 'Este cálculo não produziu um número finito.', 'LOGO_NON_FINITE');
        if (typeof value === 'string' && utf8Length(value) > 20480)
          return this.error(node, 'A palavra excedeu o limite de tamanho.', 'LOGO_VALUE_LIMIT');
        return value;
      }
    }
  }
  /** Contabiliza bytes antes de acumular texto ou palavra de uma coerção. */
  private textChunk(text: string, node: LogoNode, budget: TextBudget): string {
    budget.bytes += utf8Length(text);
    if (budget.bytes > budget.limit) this.error(node, budget.message, budget.code);
    return text;
  }
  /** Serializa como Papert sem coerção nativa de arrays e com orçamento cooperativo compartilhado. */
  private *formatValue(
    value: LogoValue,
    node: LogoNode,
    ancestors: Set<LogoValue[]>,
    depth: number,
    budget: TextBudget,
  ): Generator<void, string, void> {
    if (++this.steps > this.limits.steps)
      return this.error(node, 'O programa excedeu o limite de passos.', 'LOGO_STEP_LIMIT');
    yield;
    if (depth > 200)
      return this.error(
        node,
        'A lista está aninhada demais para converter em palavra.',
        'LOGO_VALUE_DEPTH',
      );
    if (!Array.isArray(value)) return this.textChunk(String(value), node, budget);
    if (ancestors.has(value)) return '';
    ancestors.add(value);
    const parts: string[] = [];
    for (let i = 0; i < value.length; i++) {
      if (i > 0) parts.push(this.textChunk(',', node, budget));
      const item = value[i];
      parts.push(
        item == null ? '' : yield* this.formatValue(item, node, ancestors, depth + 1, budget),
      );
    }
    ancestors.delete(value);
    return parts.join('');
  }
  /** Reanalisa corpos com assinaturas atuais e cache por revisão, mantendo offsets da definição original. */
  private bodyFor(entry: DefinitionEntry): readonly LogoNode[] {
    if (entry.cache?.revision === this.definitionRevision) return entry.cache.body;
    const start = entry.node.body[0]?.span.start ?? entry.node.span.end - 3;
    const end = entry.node.body.at(-1)?.span.end ?? start;
    const parsed = parseLogo(
      entry.source.slice(start, end),
      new Map(
        [...this.definitions].map(([name, definition]) => [
          name,
          definition.node.parameters.length,
        ]),
      ),
    );
    if (!parsed.ok) {
      const diagnostic = parsed.diagnostics[0];
      throw new RuntimeFailure(
        diagnostic
          ? {
              ...diagnostic,
              ...(diagnostic.span
                ? {
                    span: {
                      start: diagnostic.span.start + start,
                      end: diagnostic.span.end + start,
                    },
                  }
                : {}),
            }
          : { code: 'LOGO_SYNTAX', message: 'Não foi possível analisar o procedimento.' },
      );
    }
    const body = parsed.value.body.map((node) => shiftNode(node, start));
    entry.cache = { revision: this.definitionRevision, body };
    return body;
  }
  /** Aplica controles com argumentos não avaliados e demais comandos com valores avaliados. */
  private *call(node: Extract<LogoNode, { kind: 'call' }>): Generator<void, LogoValue, void> {
    const name = infixCatalog[node.name]?.name ?? resolveCommand(node.name)?.name ?? node.name;
    if (name === 'true') return true;
    if (name === 'false') return false;
    if (name === 'stop') throw new ProcedureReturn(null);
    const arg = (index: number): LogoNode => {
      const value = node.args[index];
      if (!value) return this.error(node, `${name} precisa de mais informações.`);
      return value;
    };
    if (
      ['repeat', 'forever', 'while', 'until', 'do.while', 'do.until', 'if', 'ifelse'].includes(name)
    ) {
      if (name === 'if' || name === 'ifelse') {
        const condition = yield* this.evaluate(arg(0));
        return condition
          ? yield* this.evaluate(arg(1))
          : name === 'ifelse'
            ? yield* this.evaluate(arg(2))
            : undefined;
      }
      if (name === 'repeat') {
        const count = this.numeric(yield* this.evaluate(arg(0)), node);
        if (!Number.isInteger(count))
          return this.error(node, 'Repeat precisa de um número inteiro de vezes.');
        for (let i = 0; i < count; i++) yield* this.evaluate(arg(1));
        return undefined;
      }
      if (name === 'forever') {
        for (;;) yield* this.evaluate(arg(0));
      }
      const post = name.startsWith('do.');
      const until = name.endsWith('until');
      for (;;) {
        if (post) yield* this.evaluate(arg(1));
        const condition = yield* this.evaluate(arg(0));
        if (until ? condition : !condition) break;
        if (!post) yield* this.evaluate(arg(1));
      }
      return undefined;
    }
    const values = yield* this.evaluateList(node.args);
    const a = values[0],
      b = values[1],
      c = values[2];
    const number = (value: LogoValue): number => this.numeric(value, node);
    const sequence = (value: LogoValue): LogoValue[] | string => this.sequenceValue(value, node);
    const turtleNames = [
      'forward',
      'backward',
      'right',
      'left',
      'setx',
      'sety',
      'setxy',
      'setheading',
      'setpos',
      'penup',
      'pendown',
      'home',
      'undo',
      'redo',
      'color',
      'penwidth',
      'hideturtle',
      'showturtle',
      'clearscreen',
      'clean',
      'reset',
      'circle',
      'arc',
    ];
    if (turtleNames.includes(name)) {
      const args =
        name === 'color' || name === 'setpos'
          ? Array.isArray(a)
            ? a.map(number)
            : this.error(node, `${name} precisa de uma lista.`)
          : values.map(number);
      if ((name === 'setpos' && args.length !== 2) || (name === 'color' && args.length !== 3))
        return this.error(node, `${name} recebeu uma lista com tamanho inválido.`);
      if (
        ['setx', 'sety', 'setxy', 'setpos'].includes(name) &&
        args.some((value) => !Number.isInteger(value))
      )
        return this.error(node, `${name} precisa de posição inteira.`);
      if (name === 'color' && args.some((value) => value < 0 || value > 255))
        return this.error(node, 'A cor precisa de valores de 0 a 255.');
      if (name === 'penwidth' && (args[0] ?? 0) <= 0)
        return this.error(node, 'A largura da pena precisa ser positiva.');
      if ((name === 'arc' || name === 'circle') && (args[0] ?? 0) < 0)
        return this.error(node, 'O raio precisa ser positivo.');
      this.turtle.execute(name, args);
      this.effects.push({ type: 'draw', operations: [], turtle: this.turtle.view() });
      return undefined;
    }
    switch (name) {
      case 'print': {
        if (values.some((value) => value === undefined))
          return this.error(node, 'Print precisa de uma informação.');
        const parts: string[] = [];
        const printed = Array.isArray(a) ? a : values;
        const budget: TextBudget = {
          bytes: this.textBytes,
          limit: this.limits.textBytes,
          code: 'LOGO_TEXT_LIMIT',
          message: 'O programa excedeu o limite de saída textual.',
        };
        for (const value of printed) {
          parts.push(yield* this.formatValue(value, node, new Set(), 0, budget));
          if (Array.isArray(a)) parts.push(this.textChunk(' ', node, budget));
        }
        this.textBytes = budget.bytes;
        this.effects.push({ type: 'text', text: parts.join('') });
        return undefined;
      }
      case 'cleartext':
        this.effects.push({ type: 'clear-text' });
        return undefined;
      case 'first':
        return sequence(a)[0];
      case 'last': {
        const list = sequence(a);
        return list[list.length - 1];
      }
      case 'butfirst':
      case 'butlast': {
        const target = sequence(a);
        if (Array.isArray(target)) this.reserveItems(Math.max(0, target.length - 1), node);
        return name === 'butfirst' ? target.slice(1) : target.slice(0, -1);
      }
      case 'item':
        return sequence(b)[number(a)];
      case 'setitem':
        if (!Array.isArray(b)) return this.error(node, 'Setitem precisa de lista.');
        if (!Number.isSafeInteger(number(a)) || number(a) < 0 || number(a) >= this.limits.listItems)
          return this.error(node, 'Índice fora dos limites.', 'LOGO_LIST_LIMIT');
        this.reserveItems(Math.max(0, number(a) + 1 - b.length), node);
        b[number(a)] = c;
        return undefined;
      case 'empty?':
        return sequence(a).length === 0;
      case 'fput':
        this.reserveItems(Array.isArray(b) ? b.length + 1 : 2, node);
        return Array.isArray(b) ? [a].concat(b) : [a, sequence(b)];
      case 'lput': {
        if (Array.isArray(b)) {
          this.reserveItems(b.length + (Array.isArray(a) ? a.length : 1), node);
          return b.concat(a);
        }
        if (typeof b !== 'string') return this.error(node, 'Lput precisa de lista ou palavra.');
        const budget: TextBudget = {
          bytes: utf8Length(b),
          limit: 20480,
          code: 'LOGO_VALUE_LIMIT',
          message: 'A palavra excedeu o limite de tamanho.',
        };
        return b + (yield* this.formatValue(a, node, new Set(), 0, budget));
      }
      case 'int':
        return Math.floor(number(a));
      case 'round':
        return Math.round(number(a));
      case 'sqrt':
        return Math.sqrt(number(a));
      case 'power':
        return Math.pow(number(a), number(b));
      case 'exp':
        return Math.exp(number(a));
      case 'ln':
        return Math.log(number(a));
      case 'log10':
        return Math.LOG10E * Math.log(number(a));
      case 'sin':
        return Math.sin((number(a) / 180) * Math.PI);
      case 'cos':
        return Math.cos((number(a) / 180) * Math.PI);
      case 'arctan':
        return (Math.atan(number(a)) * 180) / Math.PI;
      case 'radsin':
        return Math.sin(number(a));
      case 'radcos':
        return Math.cos(number(a));
      case 'radarctan':
        return Math.atan(number(a));
      case 'random':
        return Math.floor(this.random() * number(a));
      case 'rerandom':
        this.srand(number(a));
        return undefined;
      case 'bitand':
        return values.slice(1).reduce<number>((total, value) => total & number(value), number(a));
      case 'bitor':
        return values.reduce<number>((total, value) => total | number(value), 0);
      case 'bitxor':
        return values.reduce<number>((total, value) => total ^ number(value), 0);
      case 'bitnot':
        return ~number(a);
      case 'sum':
        return values.reduce<number>((total, value) => total + number(value), 0);
      case 'difference':
        return number(a) - number(b);
      case 'product':
        return values.reduce<number>((total, value) => total * number(value), 1);
      case 'divide':
        return number(a) / number(b);
      case 'modulo':
        return number(a) % number(b);
      case 'minus':
        return -number(a);
      case 'or':
        return a || b;
      case 'and':
        return a && b;
      case 'not':
        return !a;
      case 'equal?':
        return logoEqual(a, b);
      case 'notequal?':
        return !logoEqual(a, b);
      case 'less?':
      case 'greater?':
      case 'lessequal?':
      case 'greaterequal?': {
        const budget: TextBudget = {
          bytes: 0,
          limit: 20480,
          code: 'LOGO_VALUE_LIMIT',
          message: 'A palavra excedeu o limite de tamanho.',
        };
        const left = Array.isArray(a) ? yield* this.formatValue(a, node, new Set(), 0, budget) : a;
        budget.bytes = 0;
        const right = Array.isArray(b) ? yield* this.formatValue(b, node, new Set(), 0, budget) : b;
        if (typeof left === 'string' && typeof right === 'string')
          return name === 'less?'
            ? left < right
            : name === 'greater?'
              ? left > right
              : name === 'lessequal?'
                ? left <= right
                : left >= right;
        const x = Number(left),
          y = Number(right);
        return name === 'less?'
          ? x < y
          : name === 'greater?'
            ? x > y
            : name === 'lessequal?'
              ? x <= y
              : x >= y;
      }
      case 'array': {
        const size = number(a);
        if (!Number.isSafeInteger(size) || size < 0 || size > this.limits.listItems)
          return this.error(node, 'Array excede o limite de itens.', 'LOGO_LIST_LIMIT');
        this.reserveItems(size, node);
        return Array.from({ length: size }, () => 0);
      }
      case 'make':
        if (typeof a !== 'string' || b == null)
          return this.error(node, 'Make precisa de nome e valor.');
        if (a.length > 256 || (typeof b === 'string' && utf8Length(b) > 20480))
          return this.error(node, 'Nome ou palavra excede os limites.', 'LOGO_VALUE_LIMIT');
        this.scope.set(a, b);
        return undefined;
      case 'global':
        for (const value of values) {
          if (typeof value !== 'string') return this.error(node, 'Global precisa de nomes.');
          this.scope.global(value);
        }
        return undefined;
      case 'output':
        throw new ProcedureReturn(a);
      default: {
        const definition = this.definitions.get(name);
        if (!definition) return this.error(node, `Oops, eu não sei como ${name}`);
        if (values.length !== definition.node.parameters.length)
          return this.error(node, `${name} recebeu quantidade incorreta de informações.`);
        if (this.depth >= this.limits.depth)
          return this.error(node, 'Recursão demais.', 'LOGO_DEPTH_LIMIT');
        this.depth++;
        const parent = this.scope;
        this.scope = new Scope(parent);
        definition.node.parameters.forEach((parameter, index) => {
          this.scope.set(parameter, values[index]);
        });
        try {
          return yield* this.evaluateList(this.bodyFor(definition));
        } catch (error) {
          if (error instanceof ProcedureReturn) return error.value;
          throw error;
        } finally {
          this.scope = parent;
          this.depth--;
        }
      }
    }
  }
}

/** Preserva igualdade escalar coerciva do Papert sem igualdade frouxa de JavaScript. */
function logoEqual(left: LogoValue, right: LogoValue): boolean {
  if (typeof left === typeof right) return left === right;
  if (left == null && right == null) return true;
  if (
    (typeof left === 'number' || typeof left === 'boolean' || typeof left === 'string') &&
    (typeof right === 'number' || typeof right === 'boolean' || typeof right === 'string')
  )
    return Number(left) === Number(right);
  return false;
}

/** Desloca offsets da análise local de um corpo para sua fonte integral original. */
function shiftNode(node: LogoNode, offset: number): LogoNode {
  const span = { start: node.span.start + offset, end: node.span.end + offset };
  switch (node.kind) {
    case 'call':
      return { ...node, span, args: node.args.map((child) => shiftNode(child, offset)) };
    case 'list':
      return { ...node, span, items: node.items.map((child) => shiftNode(child, offset)) };
    case 'define':
      return { ...node, span, body: node.body.map((child) => shiftNode(child, offset)) };
    default:
      return { ...node, span };
  }
}
