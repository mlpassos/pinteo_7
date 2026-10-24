import { Fragment, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createBlockId } from '../../core/program/index.js';
import type { Block, BlockAction, BlockId, BodyTarget, Value } from '../../core/program/index.js';
import type { PaletteItem } from './catalog.js';
import { findLocation } from './catalog.js';
import { ValueEditor } from './ValueEditor.js';

/** Destinos DOM só identificam posições; a árvore real continua na projeção. */
interface WorkspaceProps {
  readonly blocks: readonly Block[];
  readonly selected: BlockId | null;
  readonly pending: PaletteItem | BlockId | null;
  readonly select: (id: BlockId | null) => void;
  readonly pick: (item: PaletteItem | BlockId | null) => void;
  readonly apply: (action: BlockAction) => void;
  readonly place: (target: BodyTarget) => void;
  readonly takeExpression: () => Value | null;
  readonly beginDrag: (event: ReactPointerEvent, item: PaletteItem | BlockId) => void;
}
/** Percorre corpos e expressões; sem representação DOM persistida ou HTML externo. */
export function BlockWorkspace(props: WorkspaceProps) {
  return (
    <div className="block-stack">
      <Body {...props} body={props.blocks} parentId={null} />
    </div>
  );
}
/** Encaixes entre irmãos e corpos vazios são destinos igualmente acessíveis. */
function Body(props: WorkspaceProps & { body: readonly Block[]; parentId: BlockId | null }) {
  return (
    <>
      {Array.from({ length: props.body.length + 1 }, (_, index) => (
        <Fragment key={props.body[index]?.id ?? 'end'}>
          <button
            className="drop-slot"
            data-drop-parent={props.parentId ?? ''}
            data-drop-index={index}
            onClick={() => {
              props.place({ parentId: props.parentId, index });
            }}
            aria-label={`Encaixar na posição ${String(index + 1)} ${props.parentId ? 'dentro do corpo' : 'do programa'}`}
          >
            <span>Encaixar aqui</span>
          </button>
          {props.body[index] && <BlockView {...props} block={props.body[index]} />}
        </Fragment>
      ))}
    </>
  );
}
/** Renderiza uma peça com campos, alça e controles acessíveis de seleção/edição. */
function BlockView(props: WorkspaceProps & { block: Block }) {
  const { block, apply } = props;
  const category =
    block.kind === 'move' || block.kind === 'position'
      ? 'movement'
      : block.kind === 'pen' || block.kind === 'color'
        ? 'drawing'
        : block.kind === 'make'
          ? 'data'
          : 'control';
  const rawLabel = block.kind === 'move' || block.kind === 'pen' ? block.command : block.kind;
  const label = {
    forward: 'para frente',
    backward: 'para trás',
    left: 'girar à esquerda',
    right: 'girar à direita',
    setx: 'posição x',
    sety: 'posição y',
    position: 'posição x, y',
    penup: 'levantar caneta',
    pendown: 'baixar caneta',
    reset: 'reiniciar',
    color: 'usar a cor',
    repeat: 'repetir',
    define: 'definir procedimento',
    call: 'chamar procedimento',
    make: 'criar variável',
  }[rawLabel];
  /** Submete uma substituição atômica; a conversão valida invariantes e comentários. */
  function replace(next: Block) {
    apply({ type: 'replace', id: block.id, block: next });
  }
  /** Altera somente um slot compatível; os demais dados conservam sua identidade. */
  function valueField(value: Value, field: 'value' | 'x' | 'y' | 'times', name: string): ReactNode {
    return (
      <ValueEditor
        value={value}
        label={name}
        canInsert={typeof props.pending === 'object' && props.pending?.expression === true}
        takeExpression={props.takeExpression}
        change={(next) => {
          if (block.kind === 'move' || block.kind === 'make') replace({ ...block, value: next });
          else if (block.kind === 'repeat') replace({ ...block, times: next });
          else if (block.kind === 'position')
            replace(field === 'x' ? { ...block, x: next } : { ...block, y: next });
        }}
      />
    );
  }
  /** Move entre irmãos usando o índice de inserção da árvore anterior. */
  function reorder(direction: number) {
    const location = findLocation(props.blocks, block.id);
    if (
      !location ||
      location.index + direction < 0 ||
      location.index + direction >= location.length
    )
      return;
    apply({
      type: 'move',
      id: block.id,
      target: { parentId: location.parentId, index: location.index + (direction > 0 ? 2 : -1) },
    });
  }
  return (
    <div
      className={`block-item ${block.kind === 'repeat' || block.kind === 'define' ? 'repeat-shell' : ''} ${props.selected === block.id ? 'selected' : ''}`}
      data-block-id={block.id}
    >
      <div
        className={`code-block ${category}`}
        tabIndex={0}
        role="group"
        aria-label={`Bloco ${label}`}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            reorder(event.key === 'ArrowUp' ? -1 : 1);
          }
          if (event.key === 'Delete') {
            event.preventDefault();
            apply({ type: 'remove', id: block.id });
          }
        }}
      >
        <button
          className="grip"
          aria-label={`Arrastar ${label}`}
          onPointerDown={(event) => {
            props.beginDrag(event, block.id);
          }}
          onClick={() => {
            props.pick(block.id);
          }}
        >
          ⠿
        </button>
        <button
          className="block-select"
          aria-pressed={props.selected === block.id}
          onClick={() => {
            props.select(props.selected === block.id ? null : block.id);
          }}
          aria-label={`Selecionar ${label}`}
        >
          {label}
        </button>
        {(block.kind === 'move' || block.kind === 'make') &&
          valueField(block.value, 'value', 'Valor de ' + label)}
        {block.kind === 'repeat' && (
          <>{valueField(block.times, 'times', 'Quantidade de repetições')} vezes</>
        )}
        {block.kind === 'position' && (
          <>
            x {valueField(block.x, 'x', 'Posição x')} y {valueField(block.y, 'y', 'Posição y')}
          </>
        )}
        {(block.kind === 'define' || block.kind === 'call' || block.kind === 'make') && (
          <NameField
            name={block.name}
            change={(name) => {
              replace({ ...block, name });
            }}
          />
        )}
        {block.kind === 'color' && (
          <input
            type="color"
            aria-label="Cor da caneta"
            value={
              '#' +
              block.rgb
                .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
                .join('')
            }
            onChange={(event) => {
              const text = event.target.value;
              replace({
                ...block,
                rgb: [
                  Number.parseInt(text.slice(1, 3), 16),
                  Number.parseInt(text.slice(3, 5), 16),
                  Number.parseInt(text.slice(5, 7), 16),
                ],
              });
            }}
          />
        )}
        <span className="block-controls">
          <button
            aria-label={`Mover ${label} acima`}
            onClick={() => {
              reorder(-1);
            }}
          >
            ↑
          </button>
          <button
            aria-label={`Mover ${label} abaixo`}
            onClick={() => {
              reorder(1);
            }}
          >
            ↓
          </button>
          <button
            aria-label={`Mover ${label} para um encaixe`}
            onClick={() => {
              props.pick(block.id);
            }}
          >
            ↗
          </button>
          <button
            aria-label={`Excluir ${label}`}
            onClick={() => {
              apply({ type: 'remove', id: block.id });
            }}
          >
            ×
          </button>
        </span>
      </div>
      {(block.kind === 'repeat' || block.kind === 'define') && (
        <div className="repeat-body" aria-label={`Corpo de ${label}`}>
          <Body {...props} body={block.body} parentId={block.id} />
        </div>
      )}
    </div>
  );
}
/** Nome editável é confirmado por blur/Enter e validado pelo serviço de conversão. */
function NameField({ name, change }: { name: string; change: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelBlur = useRef(false);
  return (
    <input
      className="name-field"
      aria-label="Nome da variável ou procedimento"
      value={draft ?? name}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={() => {
        if (cancelBlur.current) {
          cancelBlur.current = false;
          setDraft(null);
          return;
        }
        if (draft !== null && draft !== name) change(draft);
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
          event.currentTarget.closest<HTMLElement>('.code-block')?.focus();
        }
        if (event.key === 'Escape') {
          cancelBlur.current = true;
          setDraft(null);
          event.currentTarget.blur();
          event.currentTarget.closest<HTMLElement>('.code-block')?.focus();
        }
      }}
    />
  );
}

/** Captura o ponteiro só nas alças; rolagem por toque continua livre no restante. */
export function useBlockDrag(
  pick: (item: PaletteItem | BlockId | null) => void,
  place: (target: BodyTarget, dragged?: PaletteItem | BlockId) => void,
) {
  const drag = useRef<{
    x: number;
    y: number;
    item: PaletteItem | BlockId;
    pointerId: number;
    element: HTMLElement;
    moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{ x: number; y: number; label: string } | null>(null);
  /** Inicia gesto sem transformar clique simples em movimento do documento. */
  function beginDrag(event: ReactPointerEvent, item: PaletteItem | BlockId) {
    if (event.button !== 0 || drag.current || !(event.currentTarget instanceof HTMLElement)) return;
    pick(item);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      item,
      pointerId: event.pointerId,
      element: event.currentTarget,
      moved: false,
    };
  }
  /** Libera destaque e captura, preservando a árvore em cancelamento. */
  function cancel() {
    const current = drag.current;
    if (current?.element.hasPointerCapture(current.pointerId))
      current.element.releasePointerCapture(current.pointerId);
    drag.current = null;
    setPreview(null);
    document.querySelectorAll('.drop-active').forEach((element) => {
      element.classList.remove('drop-active');
    });
  }
  /** Aponta o destino real sob o ponteiro, ignorando o preview visual. */
  function move(event: ReactPointerEvent) {
    const current = drag.current;
    if (
      !current ||
      event.pointerId !== current.pointerId ||
      (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 7 && !current.moved)
    )
      return;
    if (event.clientY < 45) window.scrollBy(0, -18);
    if (event.clientY > window.innerHeight - 45) window.scrollBy(0, 18);
    current.moved = true;
    event.preventDefault();
    setPreview({
      x: event.clientX,
      y: event.clientY,
      label: typeof current.item === 'string' ? 'Mover bloco' : current.item.label,
    });
    document.querySelectorAll('.drop-active').forEach((element) => {
      element.classList.remove('drop-active');
    });
    document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('.drop-slot, .expression-drop')
      ?.classList.add('drop-active');
    const area = document.querySelector('.program-body');
    const bounds = area?.getBoundingClientRect();
    if (area && bounds && event.clientX > bounds.left && event.clientX < bounds.right) {
      if (event.clientY < bounds.top + 45) area.scrollTop -= 18;
      if (event.clientY > bounds.bottom - 45) area.scrollTop += 18;
    }
  }
  /** Resolve o destino com identidades já existentes; validação final cabe ao conversor. */
  function end(event: ReactPointerEvent) {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (current.moved && typeof current.item === 'object' && current.item.expression) {
      document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLButtonElement>('.expression-drop')
        ?.click();
      cancel();
      return;
    }
    if (current.moved) {
      const element = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLButtonElement>('.drop-slot');
      if (element) {
        const parent = element.dataset.dropParent;
        const rawIndex = element.dataset.dropIndex;
        const index = Number(rawIndex);
        const parentElement = parent
          ? document.querySelector<HTMLElement>(`[data-block-id="${parent}"]`)
          : null;
        const blockId = parentElement?.dataset.blockId;
        // Identidade só vem da projeção: o chamador localiza a string no catálogo.
        if (Number.isInteger(index) && index >= 0 && rawIndex !== undefined) {
          pick(current.item);
          const identity = blockId ? createBlockId(blockId) : null;
          if (!identity || identity.ok)
            place({ parentId: identity?.ok ? identity.value : null, index }, current.item);
        }
      }
    }
    cancel();
  }
  return { beginDrag, preview, cancel, move, end };
}
