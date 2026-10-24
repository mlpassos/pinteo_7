import { useEffect, useRef, useState } from 'react';
import type { ShareStore } from '../../application/index.js';
import type { ShareEntry, SharePage } from '../../shared/index.js';
import { shareEntrySchema, sharePageSchema } from '../../shared/index.js';

/** Galeria paginada mantém erros locais e nunca troca programa em requisição cancelada. */
export function Gallery({
  store,
  load,
}: {
  store: ShareStore | undefined;
  load: (entry: ShareEntry) => Promise<void>;
}) {
  const [page, setPage] = useState<SharePage | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [retry, setRetry] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!store) return;
    let current = true;
    store
      .list(cursor)
      .then((result) => {
        if (!current) return;
        if (result.ok) {
          const validated = sharePageSchema.safeParse(result.value);
          if (validated.success) {
            setPage(validated.data);
            setError('');
          } else setError('A galeria retornou dados inválidos. Seu programa não foi alterado.');
        } else setError(result.diagnostics.map((d) => d.message).join(' '));
      })
      .catch(() => {
        if (current) setError('Não foi possível carregar a galeria. Tente novamente.');
      });
    return () => {
      current = false;
    };
  }, [store, cursor, retry]);
  /** Abre uma obra validada; falha mantém o diálogo e o documento atual intactos. */
  async function open(id: string) {
    if (!store || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await store.load(id);
      if (!mounted.current) return;
      if (!result.ok) {
        setError(result.diagnostics.map((d) => d.message).join(' '));
        return;
      }
      const parsed = shareEntrySchema.safeParse(result.value);
      if (!parsed.success) {
        setError('O programa compartilhado é inválido. Seu rascunho foi preservado.');
        return;
      }
      await load(parsed.data);
    } catch {
      if (mounted.current) setError('Falha ao abrir. Seu rascunho foi preservado.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  if (!store)
    return (
      <p role="status">
        A galeria estará disponível quando o serviço de compartilhamento for conectado.
      </p>
    );
  return (
    <>
      <p>
        Programas públicos, sem cadastro. Abrir uma obra pede confirmação antes de substituir seu
        rascunho.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
          <button
            onClick={() => {
              setRetry((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {!page && !error && <p role="status">Carregando galeria…</p>}
      <div className="gallery-grid">
        {page?.items.map((item) => (
          <button
            className="gallery-card"
            disabled={busy}
            key={item.id}
            onClick={() => {
              void open(item.id);
            }}
          >
            <img src={item.previewUrl} alt="Prévia do desenho compartilhado" loading="lazy" />
            <span>Abrir desenho</span>
            <small>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</small>
          </button>
        ))}
      </div>
      {page?.items.length === 0 && <p>Nenhum desenho compartilhado ainda.</p>}
      {page?.nextCursor && (
        <button
          disabled={busy}
          onClick={() => {
            setCursor(page.nextCursor ?? undefined);
          }}
        >
          Próxima página
        </button>
      )}
    </>
  );
}
