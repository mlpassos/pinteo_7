import type { Diagnostic } from '../core/common/index.js';
import type { BlockId, Projection } from '../core/program/index.js';
import type { ProgramDocument } from '../shared/index.js';
import type { RunStatus, Speed } from '../application/index.js';

/** Documento e sua revisão ficam juntos; projeções nunca substituem fontes novas. */
export interface WorkspaceState {
  readonly document: ProgramDocument;
  readonly revision: number;
  readonly projection: Projection | null;
  readonly mode: 'visual' | 'code';
  readonly diagnostics: readonly Diagnostic[];
  readonly selected: BlockId | null;
  readonly status: RunStatus;
  readonly output: string;
  readonly history: readonly string[];
  readonly speed: Speed;
}
/** Transições síncronas; parsing e IO são coordenados fora do reducer. */
export type WorkspaceAction =
  | { type: 'source'; source: string }
  | { type: 'projected'; projection: Projection }
  | { type: 'edited'; projection: Projection; source: string; previousRevision: number }
  | { type: 'mode'; mode: 'visual' | 'code' }
  | { type: 'diagnostics'; diagnostics: readonly Diagnostic[] }
  | { type: 'select'; id: BlockId | null }
  | { type: 'character'; characterId: ProgramDocument['characterId'] }
  | { type: 'load'; document: ProgramDocument }
  | { type: 'status'; status: RunStatus }
  | { type: 'text'; text: string }
  | { type: 'clear-text' }
  | { type: 'clear-session' }
  | { type: 'run' }
  | { type: 'speed'; speed: Speed };
/** Inicia na CLI, sem inventar uma projeção antes da conversão real. */
export function initialWorkspace(document: ProgramDocument): WorkspaceState {
  return {
    document,
    revision: 0,
    projection: null,
    mode: 'code',
    diagnostics: [],
    selected: null,
    status: 'idle',
    output: '',
    history: [],
    speed: 'normal',
  };
}
/** Mantém fonte canônica e recusa commits de projeções referentes a revisões antigas. */
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'source':
      return {
        ...state,
        document: { ...state.document, source: action.source },
        revision: state.revision + 1,
        projection: null,
        diagnostics: [],
        selected: null,
      };
    case 'projected':
      return action.projection.sourceRevision !== state.revision ||
        action.projection.originalSource !== state.document.source
        ? state
        : {
            ...state,
            projection: action.projection,
            mode: 'visual',
            diagnostics: [],
            selected: null,
          };
    case 'edited':
      if (action.previousRevision !== state.revision) return state;
      return {
        ...state,
        document: { ...state.document, source: action.source },
        revision: action.projection.sourceRevision,
        projection: action.projection,
        diagnostics: [],
      };
    case 'mode':
      return { ...state, mode: action.mode };
    case 'diagnostics':
      return { ...state, diagnostics: action.diagnostics };
    case 'select':
      return { ...state, selected: action.id };
    case 'character':
      return { ...state, document: { ...state.document, characterId: action.characterId } };
    case 'load':
      return {
        ...initialWorkspace(action.document),
        revision: state.revision + 1,
        speed: state.speed,
      };
    case 'status':
      return { ...state, status: action.status };
    case 'text':
      return { ...state, output: boundedOutput(state.output + action.text) };
    case 'clear-session':
      return { ...state, status: 'idle', output: '', history: [], diagnostics: [], selected: null };
    case 'clear-text':
      return { ...state, output: '' };
    case 'run':
      return {
        ...state,
        history: [...state.history, state.document.source].slice(-100),
        diagnostics: [],
      };
    case 'speed':
      return { ...state, speed: action.speed };
  }
}

/** Limita saída em bytes UTF-8, sem partir um caractere na borda de truncamento. */
function boundedOutput(text: string): string {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= 20 * 1024) return text;
  let start = bytes.length - 20 * 1024;
  while (start < bytes.length && (bytes[start] ?? 0) >= 128 && (bytes[start] ?? 0) < 192) start++;
  return new TextDecoder().decode(bytes.subarray(start));
}
