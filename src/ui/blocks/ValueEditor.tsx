import { useRef, useState } from 'react';
import type { Value } from '../../core/program/index.js';

/** Campo de expressão aninhada; rascunhos incompletos ficam no campo até confirmação. */
export function ValueEditor({
  value,
  label,
  change,
  takeExpression,
  canInsert,
}: {
  value: Value;
  label: string;
  change: (value: Value) => void;
  takeExpression: () => Value | null;
  canInsert: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelBlur = useRef(false);
  const [invalid, setInvalid] = useState(false);
  if (value.kind === 'operator')
    return (
      <span className="expression">
        <span>{{ sum: '+', difference: '−', product: '×', divide: '÷' }[value.command]}</span>
        <ValueEditor
          value={value.left}
          label={`${label}, primeiro operando`}
          change={(left) => {
            change({ ...value, left });
          }}
          takeExpression={takeExpression}
          canInsert={canInsert}
        />
        <ValueEditor
          value={value.right}
          label={`${label}, segundo operando`}
          change={(right) => {
            change({ ...value, right });
          }}
          takeExpression={takeExpression}
          canInsert={canInsert}
        />
        <button
          type="button"
          aria-label={`Remover expressão de ${label}`}
          onClick={() => {
            change({ kind: 'number', value: 0 });
          }}
        >
          ×
        </button>
      </span>
    );
  const text = value.kind === 'number' ? String(value.value) : ':' + value.name;
  return (
    <span className="value-slot">
      <input
        aria-label={label}
        value={draft ?? text}
        onChange={(event) => {
          setInvalid(false);
          setDraft(event.target.value);
        }}
        aria-invalid={invalid || undefined}
        onBlur={() => {
          if (cancelBlur.current) {
            cancelBlur.current = false;
            setDraft(null);
            setInvalid(false);
            return;
          }
          if (draft === null) return;
          const raw = draft.trim();
          if (
            raw === text ||
            (value.kind === 'number' && raw !== '' && Number(raw) === value.value)
          ) {
            setDraft(null);
            return;
          }
          if (raw.startsWith(':') && raw.length > 1)
            change({ kind: 'variable', name: raw.slice(1) });
          else if (raw !== '' && Number.isFinite(Number(raw)))
            change({ kind: 'number', value: Number(raw) });
          else {
            setInvalid(true);
            return;
          }
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
            event.currentTarget.closest<HTMLElement>('.code-block')?.focus();
          }
          if (event.key === 'Escape') {
            cancelBlur.current = true;
            setInvalid(false);
            setDraft(null);
            event.currentTarget.blur();
            event.currentTarget.closest<HTMLElement>('.code-block')?.focus();
          }
        }}
        title="Número ou variável, como :passos"
      />
      {invalid && <small role="alert">Use um número ou :variável.</small>}
      {canInsert && (
        <button
          type="button"
          className="expression-drop"
          onClick={() => {
            const next = takeExpression();
            if (next) change(next);
          }}
          aria-label={`Encaixar expressão em ${label}`}
        >
          ＋ expressão
        </button>
      )}
    </span>
  );
}
