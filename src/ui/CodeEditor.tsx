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
  const editor = useRef<LogoEditor | null>(null);
  const [error, setError] = useState('');
  const onChange = useEffectEvent(change);
  const currentSource = useEffectEvent(() => source);
  const currentDiagnostic = useEffectEvent(() => diagnostic);
  useEffect(() => {
    let current = true;
    void import('../infrastructure/editor/index.js')
      .then(({ LogoEditor: Editor }) => {
        if (!current || !host.current) return;
        const mounted = new Editor(host.current, currentSource(), (text) => {
          onChange(text);
        });
        editor.current = mounted;
        const position = currentDiagnostic();
        if (position) mounted.focusDiagnostic(position);
      })
      .catch(() => {
        if (current)
          setError('Não foi possível carregar o editor. Recarregue para tentar novamente.');
      });
    return () => {
      current = false;
      editor.current?.destroy();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    editor.current?.setSource(source);
  }, [source]);
  useEffect(() => {
    if (diagnostic) editor.current?.focusDiagnostic(diagnostic);
  }, [diagnostic]);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div className="editor-host" ref={host} />
    </>
  );
}
