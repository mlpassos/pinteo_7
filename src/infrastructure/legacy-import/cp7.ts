import { fail, succeed } from '../../core/common/index.js';
import type { Result } from '../../core/common/index.js';
import { parseLogo } from '../../core/logo/index.js';

/** Limites do dialeto de migração, menores que um documento HTML genérico. */
export const CP7_LIMITS = {
  bytes: 128 * 1024,
  elements: 5000,
  depth: 64,
  attribute: 2048,
} as const;

type Element = { tag: string; attributes: Record<string, string>; children: (Element | string)[] };

/** Estrutura segura extraída; não contém tags, classes, estilos ou HTML para renderizar. */
export type LegacyStatement =
  | Readonly<{ kind: 'instruction'; source: string }>
  | Readonly<{ kind: 'repeat'; count: string; body: readonly LegacyStatement[] }>
  | Readonly<{ kind: 'define'; name: string; body: readonly LegacyStatement[] }>
  | Readonly<{ kind: 'orphan-expression'; source: string }>;

/** Resultado inerte para auditoria, não uma projeção visual parcial. */
export type ImportedCp7 = Readonly<{
  source: string;
  statements: readonly LegacyStatement[];
  bareVariables: readonly string[];
  orphanExpressions: readonly string[];
}>;

/** Falha do dialeto fechado, convertida em diagnóstico no único ponto de entrada. */
class Cp7Failure extends Error {}

const attributes = new Set([
  'class',
  'title',
  'style',
  'id',
  'aria-describedby',
  'contenteditable',
  'data-code',
  'data-what',
  'data-value',
  'data-loops',
  'data-amount',
  'data-valor1',
  'data-valor2',
  'data-posx',
  'data-posy',
]);
const classes = new Set([
  'funcao-make',
  'codeblocks-list-item',
  'funcao-make-head',
  'name',
  'numero',
  'funcao-callvar',
  'value',
  'codeblocks-list-trash',
  'funcao-procedimento',
  'funcao-procedimento-head',
  'procedimento-input',
  'codeblocks-procedimento',
  'editable',
  'funcao-movimento',
  'ui-draggable',
  'ui-droppable',
  'funcao-operadores',
  'funcao-divide',
  'valor1',
  'valor2',
  'funcao-repeat',
  'funcao-repeat-head',
  'codeblocks-repeat',
  'funcao-repeat-trash',
  'funcao-solta',
  'funcao-call',
  'funcao-product',
  'funcao-sum',
  'funcao-difference',
  'posx',
  'posy',
  'codeblocks-list-item-alt',
]);
const tagNames = new Set(['li', 'div', 'span', 'ol', 'br']);

/** Recusa texto desconhecido em vez de reproduzir recuperação ambígua de um navegador. */
function reject(message: string): never {
  throw new Cp7Failure(message);
}

/** Decodifica somente entidades finitas, uma vez; não há DTD ou expansão externa. */
function decodeEntities(value: string): string {
  const named: Readonly<Record<string, string>> = {
    nbsp: '\u00a0',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };
  return value.replace(/&([^;\s&<>]*);?/g, (_match: string, entity: string) => {
    if (named[entity] !== undefined) return named[entity];
    if (/^#(?:[0-9]+|x[0-9a-f]+)$/i.test(entity)) {
      const point =
        entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      if (point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff))
        return String.fromCodePoint(point);
    }
    return reject('Entidade não permitida no CP7.');
  });
}

/** Valida até atributos descartados para não aceitar handlers, URLs ou CSS arbitrário. */
function validateAttribute(name: string, value: string): void {
  if (
    !attributes.has(name) ||
    value.length > CP7_LIMITS.attribute ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    reject('Atributo não permitido no CP7.');
  if (
    name === 'data-code' &&
    !/^(?:[a-z][a-z0-9_]*|color \[[0-9]{1,3} [0-9]{1,3} [0-9]{1,3}\])$/i.test(value)
  )
    reject('Comando inválido no CP7.');
  if (name === 'data-what') nameValue(value);
  if (name.startsWith('data-') && !['data-code', 'data-what'].includes(name))
    expression(value, new Set());
  if (name === 'class' && value.split(/\s+/).some((token) => !classes.has(token)))
    reject('Classe não reconhecida no CP7.');
  if (name === 'contenteditable' && !['true', 'false'].includes(value))
    reject('Estado de edição inválido no CP7.');
  if (name === 'id' && !/^ui-id-[0-9]+$/.test(value))
    reject('Identificador de apresentação inválido no CP7.');
  if (name === 'aria-describedby' && !/^ui-tooltip-[0-9]+$/.test(value))
    reject('Referência de apresentação inválida no CP7.');
  if (name === 'style') {
    for (const declaration of value
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)) {
      if (['position: relative', 'z-index: 0'].includes(declaration)) continue;
      const rgb = /^background-color: rgb\(([0-9]{1,3}), ([0-9]{1,3}), ([0-9]{1,3})\)$/.exec(
        declaration,
      );
      if (!rgb || rgb.slice(1).some((number) => Number(number) > 255))
        reject('Estilo não permitido no CP7.');
    }
  }
}

/** Lê o dialeto como tokens e pilha própria; não usa DOMParser, innerHTML ou rede. */
function readDialect(source: string): Element {
  if (new TextEncoder().encode(source).length > CP7_LIMITS.bytes)
    reject('CP7 excede o limite de 128 KiB.');
  const root: Element = { tag: 'root', attributes: {}, children: [] };
  const stack = [root];
  let offset = 0,
    count = 0;
  while (offset < source.length) {
    const parent = stack.at(-1);
    if (!parent) reject('Estrutura inválida no CP7.');
    if (source[offset] !== '<') {
      const next = source.indexOf('<', offset);
      const end = next < 0 ? source.length : next;
      parent.children.push(decodeEntities(source.slice(offset, end)));
      offset = end;
      continue;
    }
    const rest = source.slice(offset);
    const closing = /^<\/([a-z]+)\s*>/i.exec(rest);
    if (closing) {
      if (stack.length === 1 || closing[1]?.toLowerCase() !== parent.tag)
        reject('Fechamento de elemento inválido no CP7.');
      stack.pop();
      offset += closing[0].length;
      continue;
    }
    const opening = /^<([a-z]+)(?=[\s/>])/i.exec(rest);
    const tag = opening?.[1]?.toLowerCase();
    if (!opening || !tag || !tagNames.has(tag)) reject('Elemento não permitido no CP7.');
    if (++count > CP7_LIMITS.elements || stack.length > CP7_LIMITS.depth)
      reject('Estrutura CP7 excede os limites.');
    const node: Element = { tag, attributes: {}, children: [] };
    offset += opening[0].length;
    for (;;) {
      const remaining = source.slice(offset);
      const end = /^\s*(\/?>)/.exec(remaining);
      if (end) {
        if (end[1] === '/>' && tag !== 'br') reject('Elemento autoencerrado não permitido no CP7.');
        offset += end[0].length;
        break;
      }
      const attribute = /^\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/i.exec(remaining);
      const name = attribute?.[1]?.toLowerCase();
      if (!attribute || !name || Object.hasOwn(node.attributes, name))
        reject('Atributo malformado ou duplicado no CP7.');
      const value = decodeEntities(attribute[2] ?? attribute[3] ?? '');
      validateAttribute(name, value);
      node.attributes[name] = value;
      offset += attribute[0].length;
    }
    if ((parent.tag === 'root' || parent.tag === 'ol') && tag !== 'li')
      reject('O corpo CP7 deve conter somente peças.');
    if (tag === 'li' && !['root', 'ol'].includes(parent.tag))
      reject('Peça fora de um corpo permitido.');
    if (tag === 'ol' && parent.tag !== 'li') reject('Corpo fora de uma peça.');
    if (tag === 'br' && Object.keys(node.attributes).length > 0)
      reject('Quebra de linha com atributos não permitida.');
    parent.children.push(node);
    if (tag !== 'br') stack.push(node);
  }
  if (stack.length !== 1) reject('CP7 incompleto.');
  return root;
}

/** Nome LOGO permitido nos campos legados, sem código ou URL embutido. */
function nameValue(value: string | undefined): string {
  if (value === undefined || !/^[a-z][a-z0-9_]*$/i.test(value))
    return reject('Nome inválido no CP7.');
  return value.toLowerCase();
}

/** Lista só peças de um corpo, recusando texto solto que pudesse ser perdido. */
function pieces(element: Element): Element[] {
  const result: Element[] = [];
  for (const child of element.children) {
    if (typeof child === 'string') {
      if (child.trim()) reject('Texto fora de uma peça CP7.');
    } else {
      if (child.tag !== 'li') reject('Elemento fora de uma peça CP7.');
      result.push(child);
    }
  }
  return result;
}

/** Recria expressões dos atributos: palavras nuas dos slots são variáveis explícitas. */
function expression(value: string | undefined, variables: Set<string>): string {
  if (!value || value.length > 1024) return reject('Valor ausente ou excessivo no CP7.');
  let offset = 0;
  const tokens: string[] = [];
  while (offset < value.length) {
    const match = /^(\s+|[0-9]+(?:\.[0-9]+)?|:?[a-z][a-z0-9_]*|[+\-*/()])/i.exec(
      value.slice(offset),
    );
    const token = match?.[0];
    if (!token) return reject('Expressão não permitida no CP7.');
    offset += token.length;
    if (!token.trim()) continue;
    if (/^:?[a-z]/i.test(token)) {
      const name = token.replace(/^:/, '').toLowerCase();
      if (!token.startsWith(':')) variables.add(name);
      tokens.push(`:${name}`);
    } else tokens.push(token);
  }
  const candidate = tokens.join(' ');
  const parsed = parseLogo(`print ${candidate}`);
  if (
    !parsed.ok ||
    parsed.value.body.length !== 1 ||
    parsed.value.body[0]?.kind !== 'call' ||
    parsed.value.body[0].args.length !== 1
  )
    return reject('O slot CP7 não representa uma expressão única.');
  return tokens.length === 1 ? candidate : `(${candidate})`;
}

/** Extrai somente atributos semânticos conhecidos, preservando operadores soltos para auditoria. */
function statement(element: Element, variables: Set<string>, orphans: string[]): LegacyStatement {
  const data = element.attributes;
  const code = data['data-code'];
  if (!code) return reject('Peça sem comando no CP7.');
  const bodies = element.children.filter(
    (child): child is Element => typeof child !== 'string' && child.tag === 'ol',
  );
  if (code === 'repeat' || code === 'to') {
    if (bodies.length !== 1 || !bodies[0]) return reject('Peça de corpo com estrutura inválida.');
    const body = pieces(bodies[0]).map((child) => statement(child, variables, orphans));
    return code === 'repeat'
      ? { kind: 'repeat', count: expression(data['data-loops'], variables), body }
      : { kind: 'define', name: nameValue(data['data-what']), body };
  }
  if (bodies.length > 0) return reject('Corpo inesperado em peça simples.');
  if (['forward', 'backward', 'left', 'right', 'setx', 'sety'].includes(code))
    return { kind: 'instruction', source: `${code} ${expression(data['data-amount'], variables)}` };
  if (code === 'setxy')
    return {
      kind: 'instruction',
      source: `setxy ${expression(data['data-posx'], variables)} ${expression(data['data-posy'], variables)}`,
    };
  if (['penup', 'pendown', 'reset'].includes(code)) return { kind: 'instruction', source: code };
  if (code === 'make')
    return {
      kind: 'instruction',
      source: `make "${nameValue(data['data-what'])} ${expression(data['data-value'], variables)}`,
    };
  const color = /^color \[([0-9]{1,3}) ([0-9]{1,3}) ([0-9]{1,3})\]$/.exec(code);
  if (color && color.slice(1).every((component) => Number(component) <= 255))
    return { kind: 'instruction', source: code };
  if (['sum', 'difference', 'product', 'divide'].includes(code)) {
    const source = `${code} ${expression(data['data-valor1'], variables)} ${expression(data['data-valor2'], variables)}`;
    orphans.push(source);
    return { kind: 'orphan-expression', source };
  }
  if (!(data.class ?? '').split(/\s+/).includes('funcao-call'))
    return reject('Comando não reconhecido no CP7.');
  return { kind: 'instruction', source: nameValue(code) };
}

/** Serializa a estrutura auditável exclusivamente para texto LOGO, sem HTML ou execução. */
function sourceOf(statements: readonly LegacyStatement[]): string {
  return statements
    .map((item) => {
      switch (item.kind) {
        case 'instruction':
        case 'orphan-expression':
          return item.source;
        case 'repeat':
          return `repeat ${item.count} [\n${sourceOf(item.body)}\n]`;
        case 'define':
          return `to ${item.name}\n${sourceOf(item.body)}\nend`;
      }
    })
    .join('\n');
}

/** Importa o dialeto CP7 histórico como dados; falha inteira diante de conteúdo desconhecido. */
export function importLegacyCp7(source: string): Result<ImportedCp7> {
  try {
    const tree = readDialect(source);
    const variables = new Set<string>(),
      orphanExpressions: string[] = [];
    const statements = pieces(tree).map((element) =>
      statement(element, variables, orphanExpressions),
    );
    const logo = sourceOf(statements);
    const parsed = parseLogo(logo);
    if (!parsed.ok)
      return fail({
        code: 'CP7_LOGO_INVALID',
        message: 'A estrutura CP7 não produz um programa LOGO válido.',
      });
    return succeed({
      source: logo,
      statements,
      bareVariables: [...variables].sort(),
      orphanExpressions,
    });
  } catch (error) {
    if (error instanceof Cp7Failure) return fail({ code: 'CP7_REJECTED', message: error.message });
    throw error;
  }
}
