import type { Block, BlockId, Value } from '../../core/program/index.js';

/** Operações visuais mantêm o catálogo legado de 19 opções. */
export const CATEGORIES = [
  'Movimento',
  'Desenho',
  'Repetição',
  'Procedimentos',
  'Variáveis',
  'Operadores',
] as const;
/** Entrada da paleta: expressões são encaixadas em valores, nunca na raiz. */
export interface PaletteItem {
  readonly label: string;
  readonly category: number;
  readonly create: (id: BlockId) => Block | Value;
  readonly expression?: boolean;
}
const number = { kind: 'number', value: 100 } as const;
export const PALETTE: readonly PaletteItem[] = [
  ...(['forward', 'backward', 'left', 'right', 'setx', 'sety'] as const).map(
    (command, i): PaletteItem => ({
      category: 0,
      label:
        [
          'Para frente',
          'Para trás',
          'Girar à esquerda',
          'Girar à direita',
          'Posição x',
          'Posição y',
        ][i] ?? command,
      create: (id) => ({
        id,
        kind: 'move',
        command,
        value: { kind: 'number', value: i < 2 ? 100 : i < 4 ? 90 : 0 },
      }),
    }),
  ),
  {
    category: 0,
    label: 'Posição x, y',
    create: (id) => ({
      id,
      kind: 'position',
      x: { kind: 'number', value: 0 },
      y: { kind: 'number', value: 0 },
    }),
  },
  ...(['pendown', 'penup', 'reset'] as const).map((command, i): PaletteItem => ({
    category: 1,
    label: ['Baixar caneta', 'Levantar caneta', 'Reiniciar'][i] ?? command,
    create: (id) => ({ id, kind: 'pen', command }),
  })),
  {
    category: 1,
    label: 'Escolher cor',
    create: (id) => ({ id, kind: 'color', rgb: [118, 77, 215] }),
  },
  {
    category: 2,
    label: 'Repetir',
    create: (id) => ({ id, kind: 'repeat', times: { kind: 'number', value: 4 }, body: [] }),
  },
  {
    category: 3,
    label: 'Definir procedimento',
    create: (id) => ({ id, kind: 'define', name: 'desenho', body: [] }),
  },
  {
    category: 3,
    label: 'Chamar procedimento',
    create: (id) => ({ id, kind: 'call', name: 'desenho' }),
  },
  {
    category: 4,
    label: 'Criar variável',
    create: (id) => ({ id, kind: 'make', name: 'passos', value: number }),
  },
  ...(['sum', 'difference', 'product', 'divide'] as const).map((command, i): PaletteItem => ({
    category: 5,
    label: ['Soma', 'Diferença', 'Produto', 'Divisão'][i] ?? command,
    expression: true,
    create: () => ({
      kind: 'operator',
      command,
      left: { kind: 'number', value: 10 },
      right: { kind: 'number', value: 2 },
    }),
  })),
];
/** Localiza irmãos e pai para reordenação acessível. */
export function findLocation(
  blocks: readonly Block[],
  id: BlockId,
  parentId: BlockId | null = null,
): { parentId: BlockId | null; index: number; length: number } | undefined {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block) continue;
    if (block.id === id) return { parentId, index: i, length: blocks.length };
    if (block.kind === 'repeat' || block.kind === 'define') {
      const found = findLocation(block.body, id, block.id);
      if (found) return found;
    }
  }
  return undefined;
}
