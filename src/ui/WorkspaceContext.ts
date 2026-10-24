import { createContext, useContext } from 'react';
import type { WorkspaceState } from './state.js';

/** Leitura compartilhada; efeitos de IO permanecem nas ações da composição. */
export const WorkspaceContext = createContext<WorkspaceState | null>(null);
/** Exige o provider e evita uma segunda cópia do documento nos painéis. */
export function useWorkspace(): WorkspaceState {
  const state = useContext(WorkspaceContext);
  if (!state) throw new Error('O painel deve estar dentro do ambiente do programa.');
  return state;
}
