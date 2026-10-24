import { createRenderer } from '../../src/infrastructure/canvas/index.js';
import { fail, succeed } from '../../src/core/common/index.js';
import type { Result } from '../../src/core/common/index.js';
import { createBlockId } from '../../src/core/program/index.js';
import type {
  Block,
  BlockAction,
  BlockId,
  BodyTarget,
  ConversionService,
  Projection,
  Value,
} from '../../src/core/program/index.js';
import type { RunEvent, Runner, ShareStore, Speed } from '../../src/application/index.js';
import type { ShareEntry } from '../../src/shared/index.js';
import type { UiServices } from '../../src/ui/index.js';

export const TEST_SOURCE = '; Fonte preservada no teste\nrepeat 4 [forward 100 right 90]\n';
/** Identidade verificável só para fixtures explícitas. */
function id(text: string): BlockId {
  const result = createBlockId(text);
  if (!result.ok) throw new Error('Fixture inválida');
  return result.value;
}
const fixture: readonly Block[] = [
  {
    id: id('loop'),
    kind: 'repeat',
    times: { kind: 'number', value: 4 },
    body: [
      {
        id: id('forward'),
        kind: 'move',
        command: 'forward',
        value: { kind: 'number', value: 100 },
      },
      { id: id('right'), kind: 'move', command: 'right', value: { kind: 'number', value: 90 } },
    ],
  },
];
/** Serializador de fixture, sem parser/conversor de produto; só o teste importa este arquivo. */
function valueText(value: Value): string {
  if (value.kind === 'number') return String(value.value);
  if (value.kind === 'variable') return ':' + value.name;
  return `${value.command} ${valueText(value.left)} ${valueText(value.right)}`;
}
/** Registra saídas da fixture para permitir ida e volta sem interpretar texto. */
function blockText(block: Block): string {
  switch (block.kind) {
    case 'move':
      return `${block.command} ${valueText(block.value)}`;
    case 'position':
      return `setxy ${valueText(block.x)} ${valueText(block.y)}`;
    case 'pen':
      return block.command;
    case 'color':
      return `color [${block.rgb.join(' ')}]`;
    case 'repeat':
      return `repeat ${valueText(block.times)} [${block.body.map(blockText).join(' ')}]`;
    case 'define':
      return `to ${block.name}\n${block.body.map(blockText).join('\n')}\nend`;
    case 'call':
      return block.name;
    case 'make':
      return `make "${block.name} ${valueText(block.value)}`;
  }
}
/** Localiza referência da fixture clonada para scripts de interação do navegador. */
function locate(blocks: readonly Block[], wanted: BlockId): Block | undefined {
  for (const block of blocks) {
    if (block.id === wanted) return block;
    if (block.kind === 'repeat' || block.kind === 'define') {
      const found = locate(block.body, wanted);
      if (found) return found;
    }
  }
  return undefined;
}
/** Modifica um corpo com caminhos conhecidos, suficiente para observar a UI isolada. */
function mapBody(
  blocks: readonly Block[],
  parentId: BlockId | null,
  transform: (body: readonly Block[]) => readonly Block[],
): readonly Block[] {
  if (parentId === null) return transform(blocks);
  return blocks.map((block) => {
    if (block.kind !== 'repeat' && block.kind !== 'define') return block;
    return {
      ...block,
      body:
        block.id === parentId ? transform(block.body) : mapBody(block.body, parentId, transform),
    };
  });
}
/** Porta de teste aceita apenas fontes que este fake já conhece; não interpreta LOGO. */
export class TestConversion implements ConversionService {
  private readonly documents = new Map<string, readonly Block[]>([
    [TEST_SOURCE, fixture],
    ['', []],
  ]);
  /** Rejeita fontes desconhecidas explicitamente, preservando todos os bytes. */
  sourceToBlocks(source: string, revision: number): Result<Projection> {
    const blocks = this.documents.get(source);
    return blocks
      ? succeed({ sourceRevision: revision, originalSource: source, blocks, comments: [] })
      : fail({
          code: 'TEST_UNSUPPORTED',
          message: 'Fonte desconhecida pelo fake de teste. Continue no Código.',
          span: { start: 0, end: 1 },
        });
  }
  /** Fixture observa comandos reais da UI e rejeita a tentativa de ciclo. */
  editBlocks(projection: Projection, action: BlockAction): Result<Projection> {
    let blocks = projection.blocks;
    if (action.type === 'insert') blocks = this.insert(blocks, action.target, action.block);
    else if (action.type === 'replace') blocks = this.replace(blocks, action.id, action.block);
    else {
      const moving = locate(blocks, action.id);
      if (!moving) return fail({ code: 'MISSING', message: 'Bloco não encontrado.' });
      if (
        action.type === 'move' &&
        (action.target.parentId === moving.id ||
          ((moving.kind === 'repeat' || moving.kind === 'define') &&
            action.target.parentId &&
            locate(moving.body, action.target.parentId)))
      )
        return fail({
          code: 'CYCLE',
          message: 'Não é possível mover uma peça para dentro dela mesma.',
        });
      blocks = this.remove(blocks, action.id);
      if (action.type === 'move') {
        const previous =
          action.target.parentId === null
            ? projection.blocks
            : locate(projection.blocks, action.target.parentId);
        const body = Array.isArray(previous)
          ? previous
          : previous && 'body' in previous
            ? previous.body
            : [];
        const index = body.findIndex((block: Block) => block.id === action.id);
        blocks = this.insert(
          blocks,
          {
            ...action.target,
            index:
              index >= 0 && index < action.target.index
                ? action.target.index - 1
                : action.target.index,
          },
          moving,
        );
      }
    }
    return succeed({ ...projection, blocks });
  }
  /** Serializa fixture registrada e conserva o comentário sentinela. */
  blocksToSource(projection: Projection): Result<string> {
    const source =
      '; Fonte preservada no teste\n' + projection.blocks.map(blockText).join('\n') + '\n';
    this.documents.set(source, projection.blocks);
    return succeed(source);
  }
  /** Insere no corpo especificado na fixture. */
  private insert(blocks: readonly Block[], target: BodyTarget, block: Block): readonly Block[] {
    return mapBody(blocks, target.parentId, (body) => [
      ...body.slice(0, target.index),
      block,
      ...body.slice(target.index),
    ]);
  }
  /** Remove uma identidade na fixture sem alterar a árvore anterior. */
  private remove(blocks: readonly Block[], wanted: BlockId): readonly Block[] {
    return blocks
      .filter((block) => block.id !== wanted)
      .map((block) =>
        block.kind === 'repeat' || block.kind === 'define'
          ? { ...block, body: this.remove(block.body, wanted) }
          : block,
      );
  }
  /** Substitui uma identidade na fixture. */
  private replace(blocks: readonly Block[], wanted: BlockId, next: Block): readonly Block[] {
    return blocks.map((block) =>
      block.id === wanted
        ? next
        : block.kind === 'repeat' || block.kind === 'define'
          ? { ...block, body: this.replace(block.body, wanted, next) }
          : block,
    );
  }
}
/** Runner de teste emite uma operação conhecida e ocupa a UI até Parar. */
class TestRunner implements Runner {
  private listeners = new Set<(event: RunEvent) => void>();
  /** Inicia somente uma sessão de observação; nenhum LOGO é executado. */
  start(_source: string, _speed: Speed): Result<void> {
    this.emit({ type: 'state', status: 'running' });
    this.emit({ type: 'text', text: 'Saída do runner de teste\n' });
    this.emit({
      type: 'draw',
      operations: [
        {
          kind: 'line',
          from: { x: 250, y: 250 },
          to: { x: 250, y: 150 },
          width: 2,
          color: [118, 77, 215],
        },
      ],
      turtle: {
        position: { x: _source === 'outside' ? -1 : 250, y: 150 },
        heading: 270,
        visible: true,
      },
    });
    return succeed(undefined);
  }
  /** Interrompe sessão de observação. */
  stop(): void {
    this.emit({ type: 'state', status: 'idle' });
  }
  /** Limpa saída e desenho de observação. */
  clear(): void {
    this.stop();
    this.emit({ type: 'clear-text' });
    this.emit({
      type: 'draw',
      operations: [{ kind: 'clear' }],
      turtle: { position: { x: 250, y: 250 }, heading: 270, visible: true },
    });
  }
  /** Velocidade não reinicia estado no fake. */
  setSpeed(_speed: Speed): void {
    /* Sem scheduler no fake. */
  }
  /** Registra uma assinatura real de eventos de teste. */
  subscribe(listener: (event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Libera assinaturas de teste. */
  dispose(): void {
    this.listeners.clear();
  }
  /** Publica eventos ordenados aos painéis. */
  private emit(event: RunEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
/** Repositório de teste falha a primeira criação, para percorrer tentativa/rede. */
function testShares(): ShareStore {
  let attempts = 0;
  const entry: ShareEntry = {
    id: 'fa5774ab-7d19-4afd-aead-598c3f63b730',
    createdAt: '2026-10-24T00:00:00Z',
    previewUrl: '/api/v1/shares/fa5774ab-7d19-4afd-aead-598c3f63b730/preview.png',
    program: { formatVersion: 1, source: TEST_SOURCE, characterId: 'capivara' },
  };
  return {
    create: () => {
      attempts++;
      return Promise.resolve(
        attempts === 1
          ? fail({
              code: 'NETWORK',
              message: 'Falha de rede de teste. Seu código e desenho foram preservados.',
            })
          : succeed(entry),
      );
    },
    list: () =>
      Promise.resolve(
        succeed({
          items: [{ id: entry.id, createdAt: entry.createdAt, previewUrl: entry.previewUrl }],
          nextCursor: null,
        }),
      ),
    load: (_id: string): Promise<Result<ShareEntry>> => Promise.resolve(succeed(entry)),
  };
}
/** Fakes existem somente na árvore de testes e são identificados no cabeçalho. */
export function createTestServices(): UiServices {
  return {
    runner: new TestRunner(),
    conversion: new TestConversion(),
    shares: testShares(),
    createRenderer,
  };
}
