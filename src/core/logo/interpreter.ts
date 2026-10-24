// Derivado do interpretador Papert de Thomas Figg e colaboradores, sob MIT.
import { fail, succeed, type Diagnostic, type Result } from '../common/index.js';
import { Turtle, type DrawOp, type TurtleView } from '../turtle/index.js';
import { infixCatalog, resolveCommand } from './catalog.js';
import { parseLogo, type LogoNode, type ParsedLogo } from './parser.js';

/** Valores LOGO preservam listas mutáveis e escopo dinâmico dos procedimentos Papert. */
export type LogoValue = number | string | boolean | LogoValue[] | undefined | null;
type Definition = Extract<LogoNode, { kind: 'define' }>;
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
    if (this.globals.has(name)) this.root().values.set(name, value);
    else this.values.set(name, value);
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
  private readonly definitions = new Map<string, Definition>();
  private scope = new Scope();
  private seed = 12345;
  private depth = 0;
  private readonly effects: LogoEffect[] = [];
  readonly turtle: Turtle;
  /** Cria a tartaruga de sessão e captura operações na ordem de execução. */
  constructor() {
    this.turtle = new Turtle((operation) => {
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
  /** Executa fonte por inteiro, preservando ambiente entre chamadas. */
  run(source: string): Result<void> {
    const parsed = parseLogo(source);
    if (!parsed.ok) return parsed;
    return this.execute(parsed.value);
  }
  /** Avalia AST previamente analisada, sem converter texto para JavaScript. */
  execute(program: ParsedLogo): Result<void> {
    try {
      for (const node of program.body) this.evaluate(node);
      return succeed(undefined);
    } catch (error) {
      if (error instanceof RuntimeFailure) return fail(error.diagnostic);
      if (error instanceof ProcedureReturn) return succeed(undefined);
      throw error;
    }
  }
  /** Avalia lista na ordem original, preservando o sinal de output/stop. */
  private evaluateList(nodes: readonly LogoNode[]): LogoValue[] {
    return nodes.map((node) => this.evaluate(node));
  }
  /** Avalia um nó Papert por despacho tipado e escopo dinâmico. */
  private evaluate(node: LogoNode): LogoValue {
    switch (node.kind) {
      case 'number':
        return node.value;
      case 'symbol':
        return node.name;
      case 'variable':
        return this.scope.get(node.name);
      case 'list':
        return this.evaluateList(node.items);
      case 'define':
        this.definitions.set(node.name, node);
        return undefined;
      case 'call':
        return this.call(node);
    }
  }
  /** Aplica controles com argumentos não avaliados e demais comandos com valores avaliados. */
  private call(node: Extract<LogoNode, { kind: 'call' }>): LogoValue {
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
        const condition = this.evaluate(arg(0));
        return condition
          ? this.evaluate(arg(1))
          : name === 'ifelse'
            ? this.evaluate(arg(2))
            : undefined;
      }
      if (name === 'repeat') {
        const count = this.numeric(this.evaluate(arg(0)), node);
        if (!Number.isInteger(count))
          return this.error(node, 'Repeat precisa de um número inteiro de vezes.');
        for (let i = 0; i < count; i++) this.evaluate(arg(1));
        return undefined;
      }
      if (name === 'forever') {
        for (;;) this.evaluate(arg(0));
      }
      const post = name.startsWith('do.');
      const until = name.endsWith('until');
      for (;;) {
        if (post) this.evaluate(arg(1));
        const condition = this.evaluate(arg(0));
        if (until ? condition : !condition) break;
        if (!post) this.evaluate(arg(1));
      }
      return undefined;
    }
    const values = this.evaluateList(node.args);
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
      this.turtle.execute(name, args);
      if (
        !this.effects.at(-1) ||
        this.effects.at(-1)?.type !== 'draw' ||
        !['forward', 'backward', 'circle', 'arc', 'reset', 'clearscreen'].includes(name)
      )
        this.effects.push({ type: 'draw', operations: [], turtle: this.turtle.view() });
      return undefined;
    }
    switch (name) {
      case 'print':
        this.effects.push({
          type: 'text',
          text: Array.isArray(a) ? a.map(String).join(' ') + ' ' : String(a),
        });
        return undefined;
      case 'cleartext':
        this.effects.push({ type: 'clear-text' });
        return undefined;
      case 'first':
        return sequence(a)[0];
      case 'last': {
        const list = sequence(a);
        return list[list.length];
      }
      case 'butfirst':
        return sequence(a).slice(1);
      case 'butlast':
        return sequence(a).slice(0, -1);
      case 'item':
        return sequence(b)[number(a)];
      case 'setitem':
        if (!Array.isArray(b)) return this.error(node, 'Setitem precisa de lista.');
        b[number(a)] = c;
        return undefined;
      case 'empty?':
        return sequence(a).length === 0;
      case 'fput':
        return Array.isArray(b) ? [a].concat(b) : [a, sequence(b)];
      case 'lput':
        return Array.isArray(b) ? b.concat([a]) : `${String(sequence(b))}${String(a)}`;
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
        return values.reduce<number>((total, value) => total & number(value), 1);
      case 'bitor':
      case 'bitxor':
        return values.reduce<number>((total, value) => total | number(value), 0);
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
        return a === b;
      case 'notequal?':
        return a !== b;
      case 'less?':
        return number(a) < number(b);
      case 'greater?':
        return number(a) > number(b);
      case 'lessequal?':
        return number(a) <= number(b);
      case 'greaterequal?':
        return number(a) >= number(b);
      case 'array':
        return new Array<LogoValue>(number(a));
      case 'make':
        if (typeof a !== 'string' || b == null)
          return this.error(node, 'Make precisa de nome e valor.');
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
        if (values.length !== definition.parameters.length)
          return this.error(node, `${name} recebeu quantidade incorreta de informações.`);
        if (++this.depth > 200) return this.error(node, 'Recursão demais.');
        const parent = this.scope;
        this.scope = new Scope(parent);
        definition.parameters.forEach((parameter, index) => {
          this.scope.set(parameter, values[index]);
        });
        try {
          return this.evaluateList(definition.body);
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
