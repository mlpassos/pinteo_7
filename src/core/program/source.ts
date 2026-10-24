import type { Block, Value } from './index.js';
import { ProjectionFailure } from './validation.js';

type SourceBudget = { length: number };
/** Conta antes de acumular fonte gerada, evitando expansão grande antes da validação final. */
function piece(text: string, budget: SourceBudget): string {
  budget.length += text.length;
  if (budget.length > 20480)
    throw new ProjectionFailure(
      'A fonte gerada excedeu o limite de 20 KiB.',
      'PROJECTION_SOURCE_LIMIT',
    );
  return text;
}
/** Serializa número finito em decimal aceito pelo tokenizer LOGO, sem notação exponencial. */
function numberSource(value: number): string {
  if (Object.is(value, -0)) return '-0';
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [mantissa = '', exponent = '0'] = text.toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const [whole = '', fraction = ''] = unsigned.split('.');
  const digits = whole + fraction;
  const position = whole.length + Number(exponent);
  const plain =
    position <= 0
      ? '0.' + '0'.repeat(-position) + digits
      : position >= digits.length
        ? digits + '0'.repeat(position - digits.length)
        : digits.slice(0, position) + '.' + digits.slice(position);
  return (negative ? '-' : '') + plain;
}
/** Operadores prefixos com dois argumentos evitam mudar precedência em slots aninhados. */
export function valueSource(value: Value, budget: SourceBudget = { length: 0 }): string {
  switch (value.kind) {
    case 'number':
      return piece(numberSource(value.value), budget);
    case 'variable':
      return piece(':' + value.name, budget);
    case 'operator':
      return (
        piece('(' + value.command + ' ', budget) +
        valueSource(value.left, budget) +
        piece(' ', budget) +
        valueSource(value.right, budget) +
        piece(')', budget)
      );
  }
}
/** Cria somente texto LOGO para um bloco validado, dentro do orçamento de fonte. */
export function blockSource(
  block: Block,
  depth = 0,
  newline = '\n',
  budget: SourceBudget = { length: 0 },
): string {
  const indent = '  '.repeat(depth),
    write = (text: string): string => piece(text, budget);
  const body = (blocks: readonly Block[]): string =>
    blocks
      .map(
        (child, index) =>
          (index ? write(newline) : '') + blockSource(child, depth + 1, newline, budget),
      )
      .join('');
  switch (block.kind) {
    case 'move':
      return write(indent + block.command + ' ') + valueSource(block.value, budget);
    case 'position':
      return (
        write(indent + 'setxy ') +
        valueSource(block.x, budget) +
        write(' ') +
        valueSource(block.y, budget)
      );
    case 'pen':
      return write(indent + block.command);
    case 'color':
      return write(indent + 'color [' + block.rgb.map(numberSource).join(' ') + ']');
    case 'make':
      return write(indent + 'make "' + block.name + ' ') + valueSource(block.value, budget);
    case 'call':
      return write(indent + block.name);
    case 'repeat':
      return (
        write(indent + 'repeat ') +
        valueSource(block.times, budget) +
        write(' [' + newline) +
        body(block.body) +
        write(newline + indent + ']')
      );
    case 'define':
      return (
        write(indent + 'to ' + block.name + newline) +
        body(block.body) +
        write(newline + indent + 'end')
      );
  }
}
