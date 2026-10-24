import { useEffect, useRef, useState } from 'react';
import type { ShareStore, Renderer } from '../../application/index.js';
import type { ProgramDocument } from '../../shared/index.js';
import { programDocumentSchema, shareEntrySchema } from '../../shared/index.js';

/** Erros de rede ficam no diálogo; o documento e o desenho não são modificados. */
export function Share({
  store,
  renderer,
  document,
}: {
  store: ShareStore | undefined;
  renderer: Renderer | null;
  document: ProgramDocument;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  /** Consulta o ciclo de vida depois de cada fronteira assíncrona. */
  function isActive(): boolean {
    return active.current;
  }
  /** Só o gesto explícito confirma criação pública; tentar novamente usa o mesmo rascunho. */
  async function share() {
    if (!store || !renderer || busy) return;
    if (!programDocumentSchema.safeParse(document).success) {
      setMessage('O programa deve ter no máximo 20 KiB em UTF-8. Seu rascunho foi preservado.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const png = await renderer.exportPng();
      if (!isActive()) return;
      const result = await store.create(document, png);
      if (!isActive()) return;
      if (!result.ok) {
        setMessage(result.diagnostics.map((d) => d.message).join(' '));
        return;
      }
      const parsed = shareEntrySchema.safeParse(result.value);
      if (!parsed.success) {
        setMessage('Resposta inválida ao compartilhar. Seu trabalho foi preservado.');
        return;
      }
      const link = new URL(window.location.pathname, window.location.origin);
      link.searchParams.set('share', parsed.data.id);
      setUrl(link.href);
      setMessage('Desenho compartilhado!');
    } catch {
      if (active.current)
        setMessage(
          'Não foi possível conectar. Seu código e desenho foram preservados. Tente novamente.',
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <>
      <p>
        Seu código e desenho ficarão <strong>públicos</strong>. Qualquer pessoa com o link poderá
        abri-los. Não inclua informações pessoais.
      </p>
      {(!store || !renderer) && (
        <p className="notice">Compartilhamento aguardando integração dos serviços.</p>
      )}
      <p role="status">{message}</p>
      {url && (
        <label>
          Link público
          <input
            readOnly
            value={url}
            onFocus={(event) => {
              event.target.select();
            }}
          />
        </label>
      )}
      <div className="dialog-actions">
        <button
          className="primary"
          disabled={!store || !renderer || busy || Boolean(url)}
          onClick={() => {
            void share();
          }}
        >
          {busy ? 'Compartilhando…' : message ? 'Tentar novamente' : 'Compartilhar publicamente'}
        </button>
      </div>
    </>
  );
}
