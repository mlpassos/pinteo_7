import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** Diálogo nativo contém Tab, fecha por Escape e restaura foco ao acionador. */
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const element = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = element.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  useLayoutEffect(() => {
    const dialog = element.current;
    if (dialog?.open && !dialog.contains(document.activeElement))
      dialog.querySelector('button')?.focus();
  }, [title]);
  return (
    <dialog
      ref={element}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="dialog-heading">
        <h2>{title}</h2>
        <button aria-label={`Fechar ${title}`} onClick={close}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
