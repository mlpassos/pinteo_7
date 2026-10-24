import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { LogoEditor } from '../infrastructure/editor/index.js';
import type { Diagnostic } from '../core/common/index.js';

/** Wrapper estável com carregamento local separado; nunca remonta ao digitar ou trocar abas. */
export function CodeEditor({
  source,
  change,
  diagnostic,
}: {
  source: string;
  change: (source: string) => void;
  diagnostic: Diagnostic | undefined;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<Pick<LogoEditor, 'setSource' | 'focusDiagnostic' | 'destroy'> | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const onChange = useEffectEvent(change);
  const currentSource = useEffectEvent(() => source);
  const currentDiagnostic = useEffectEvent(() => diagnostic);
  useEffect(() => {
    let current = true;
    const loading =
      attempt === 0
        ? import('../infrastructure/editor/index.js')
        : import('../infrastructure/editor/index.js?editor-retry');
    void loading
      .then(({ LogoEditor: Editor }) => {
        if (!current || !host.current) return;
        const mounted = new Editor(host.current, currentSource(), (text) => {
          onChange(text);
        });
        editor.current = mounted;
        setError('');
        setRetrying(false);
        const position = currentDiagnostic();
        if (position) mounted.focusDiagnostic(position);
      })
      .catch(() => {
        if (current) {
          setRetrying(false);
          setError('Não foi possível carregar o editor. Seu código continua disponível abaixo.');
        }
      });
    return () => {
      current = false;
      editor.current?.destroy();
      editor.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    editor.current?.setSource(source);
  }, [source]);
  useEffect(() => {
    if (diagnostic) editor.current?.focusDiagnostic(diagnostic);
  }, [diagnostic]);
  return (
    <>
      {error && (
        <div className="notice error">
          <p role="alert">{error}</p>
          <label>
            Código preservado para copiar
            <textarea
              readOnly
              value={source}
              rows={8}
              onFocus={(event) => {
                event.target.select();
              }}
            />
          </label>
          <button
            disabled={retrying || attempt >= 1}
            onClick={() => {
              setRetrying(true);
              setAttempt((value) => value + 1);
            }}
          >
            {retrying ? 'Carregando editor…' : 'Tentar carregar o editor novamente'}
          </button>
          {attempt >= 1 && !retrying && (
            <p>
              A tentativa alternativa também falhou. Copie seu código acima antes de recarregar a
              página.
            </p>
          )}
        </div>
      )}
      <div className="editor-host" ref={host} />
    </>
  );
}
