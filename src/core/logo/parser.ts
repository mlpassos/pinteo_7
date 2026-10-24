// Derivado do Papert de Thomas Figg e colaboradores; licença MIT em Papert-License.txt.
import { fail, succeed, type Result, type Span } from '../common/index.js';
import { infixCatalog, resolveCommand } from './catalog.js';

/** Nó da sintaxe LOGO, com posições UTF-16 na fonte original e nomes sem normalizar aliases. */
export type LogoNode = Readonly<{ span: Span }> &
  (
    | Readonly<{ kind: 'number'; value: number }>
    | Readonly<{ kind: 'symbol' | 'variable'; name: string }>
    | Readonly<{ kind: 'call'; name: string; args: readonly LogoNode[] }>
    | Readonly<{ kind: 'list'; items: readonly LogoNode[]; delimiter: 'brackets' | 'parentheses' }>
    | Readonly<{
        kind: 'define';
        name: string;
        parameters: readonly string[];
        body: readonly LogoNode[];
      }>
  );
/** Comentário bruto sem alterar fonte ou terminador de linha. */
export type LogoComment = Readonly<{ text: string; span: Span }>;
/** AST imutável e fonte integral para consumidores que não executam o programa. */
export type ParsedLogo = Readonly<{
  source: string;
  body: readonly LogoNode[];
  comments: readonly LogoComment[];
}>;
type Lexeme = Readonly<{
  kind: 'word' | 'number' | 'symbol' | 'variable' | 'operator';
  text: string;
  span: Span;
}>;

/** Falha interna localizada, convertida em Result na fronteira do parser. */
class ParseFailure extends Error {
  /** Retém intervalo da falha sem expor detalhes de implementação ao consumidor. */
  constructor(
    message: string,
    readonly span: Span,
  ) {
    super(message);
  }
}

/** Tokeniza a gramática Papert conservando offsets e comentários fora da AST executável. */
function tokenize(source: string): { tokens: Lexeme[]; comments: LogoComment[] } {
  const tokens: Lexeme[] = [],
    comments: LogoComment[] = [];
  let offset = 0;
  while (offset < source.length) {
    const rest = source.slice(offset);
    const whitespace = /^\s+/.exec(rest)?.[0];
    if (whitespace) {
      offset += whitespace.length;
      continue;
    }
    const comment = /^;[^\r\n]*/.exec(rest)?.[0];
    if (comment) {
      comments.push({ text: comment, span: { start: offset, end: offset + comment.length } });
      offset += comment.length;
      continue;
    }
    const patterns: readonly [Lexeme['kind'], RegExp][] = [
      ['operator', /^(?:!=|<>|<=|>=|\+|-|\*|\/|%|<|>|=|\[|\]|\(|\)|to|end)/i],
      ['word', /^[a-zA-Z\.]\w*\??/],
      ['variable', /^:[a-zA-Z]\w*/],
      ['number', /^\d+(?:\.\d+)?/],
      ['symbol', /^"[a-zA-Z]\w*/],
    ];
    let found = false;
    for (const [kind, pattern] of patterns) {
      const text = pattern.exec(rest)?.[0];
      if (text) {
        tokens.push({
          kind,
          text: text.toLowerCase(),
          span: { start: offset, end: offset + text.length },
        });
        offset += text.length;
        found = true;
        break;
      }
    }
    if (!found)
      throw new ParseFailure(`Não consigo entender este trecho: ${rest.slice(0, 30)}`, {
        start: offset,
        end: offset + 1,
      });
  }
  return { tokens, comments };
}

/** Parser Papert recursivo com aridades, listas, infixos e definições; não avalia LOGO. */
class LogoParser {
  private cursor = 0;
  private depth = 0;
  private readonly arities = new Map<string, number>();
  /** Recebe tokens locais, sem estado global compartilhado entre análises. */
  constructor(
    private readonly tokens: readonly Lexeme[],
    private readonly end: number,
  ) {}
  /** Consulta próximo token sem avançar. */
  private peek(): Lexeme | undefined {
    return this.tokens[this.cursor];
  }
  /** Consome token ou informa encerramento prematuro. */
  private take(): Lexeme {
    const token = this.tokens[this.cursor++];
    if (!token) throw new ParseFailure('Fonte incompleta.', { start: this.end, end: this.end });
    return token;
  }
  /** Analisa sequência até o terminador indicado, conservando todos os nós. */
  sequence(terminator?: string): LogoNode[] {
    const nodes: LogoNode[] = [];
    while (this.peek()) {
      if (this.peek()?.text === terminator) {
        this.take();
        return nodes;
      }
      nodes.push(this.expression());
    }
    if (terminator)
      throw new ParseFailure(`Você esqueceu de um ${terminator}`, {
        start: this.end,
        end: this.end,
      });
    return nodes;
  }
  /** Analisa expressão com precedência original e limite de aninhamento do parser. */
  private expression(precedence = 100): LogoNode {
    if (++this.depth > 200)
      throw new ParseFailure(
        'Sintaxe aninhada demais.',
        this.peek()?.span ?? { start: this.end, end: this.end },
      );
    const token = this.take();
    let node: LogoNode;
    if (token.kind === 'number')
      node = { kind: 'number', value: Number(token.text), span: token.span };
    else if (token.kind === 'symbol' || token.kind === 'variable')
      node = { kind: token.kind, name: token.text.slice(1), span: token.span };
    else if (token.text === '[' || token.text === '(') {
      let name: Lexeme | undefined;
      if (token.text === '(' && this.peek()?.kind === 'word') name = this.take();
      const items = this.sequence(token.text === '[' ? ']' : ')');
      const span = {
        start: token.span.start,
        end: this.tokens[this.cursor - 1]?.span.end ?? token.span.end,
      };
      node = name
        ? { kind: 'call', name: name.text, args: items, span }
        : token.text === '(' && items.length === 1 && items[0] !== undefined
          ? { ...items[0], span }
          : {
              kind: 'list',
              items,
              delimiter: token.text === '[' ? 'brackets' : 'parentheses',
              span,
            };
    } else if (token.text === 'to') {
      const name = this.take();
      if (name.kind !== 'word')
        throw new ParseFailure('Você precisa dizer um nome válido para o procedimento.', name.span);
      const parameters: string[] = [];
      while (this.peek()?.kind === 'variable') parameters.push(this.take().text.slice(1));
      this.arities.set(name.text, parameters.length);
      const body = this.sequence('end');
      if (body.some((item) => item.kind === 'define'))
        throw new ParseFailure('Você não pode ter um procedimento dentro do outro.', name.span);
      node = {
        kind: 'define',
        name: name.text,
        parameters,
        body,
        span: {
          start: token.span.start,
          end: this.tokens[this.cursor - 1]?.span.end ?? token.span.end,
        },
      };
    } else if (token.kind === 'word') {
      const arity = this.arities.get(token.text) ?? resolveCommand(token.text)?.arity ?? 0;
      const args: LogoNode[] = [];
      for (let i = 0; i < arity; i++) args.push(this.expression());
      node = {
        kind: 'call',
        name: token.text,
        args,
        span: { start: token.span.start, end: args.at(-1)?.span.end ?? token.span.end },
      };
    } else throw new ParseFailure(`Operador inesperado: ${token.text}`, token.span);
    if (
      token.kind !== 'operator' ||
      token.text === '[' ||
      token.text === '(' ||
      token.text === 'to'
    ) {
      for (;;) {
        const look = this.peek();
        const operator = look ? infixCatalog[look.text] : undefined;
        if (!look || !operator || operator.precedence >= precedence) break;
        this.take();
        const right = this.expression(operator.precedence);
        node = {
          kind: 'call',
          name: look.text,
          args: [node, right],
          span: { start: node.span.start, end: right.span.end },
        };
      }
    }
    this.depth--;
    return node;
  }
}

/** Analisa sem executar; devolve fonte e comentários intactos ou diagnóstico localizado. */
export function parseLogo(source: string): Result<ParsedLogo> {
  try {
    const { tokens, comments } = tokenize(source);
    return succeed({ source, body: new LogoParser(tokens, source.length).sequence(), comments });
  } catch (error) {
    if (error instanceof ParseFailure)
      return fail({ code: 'LOGO_SYNTAX', message: error.message, span: error.span });
    throw error;
  }
}
