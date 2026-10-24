import type { Diagnostic, Result } from '../core/common/index.js';
import type { DrawOp, TurtleView } from '../core/turtle/index.js';
import type { ProgramDocument, ShareEntry, SharePage } from '../shared/index.js';

/** Running inclui execução e desenho aceito ainda pendente. */
export type RunStatus = 'idle' | 'running' | 'error';

/** Preferência de velocidade sem alteração implícita da sessão LOGO. */
export type Speed = 'slow' | 'normal' | 'fast';

/** Eventos entregues em ordem pelo runner, sem referência a componentes UI. */
export type RunEvent =
  | Readonly<{ type: 'state'; status: RunStatus }>
  | Readonly<{ type: 'text'; text: string }>
  | Readonly<{ type: 'clear-text' }>
  | Readonly<{ type: 'draw'; operations: readonly DrawOp[]; turtle: TurtleView }>
  | Readonly<{ type: 'error'; diagnostic: Diagnostic }>;

/** Porta da execução cooperativa, preservando a semântica de sessão do legado. */
export interface Runner {
  /** Inicia a fonte; falhas esperadas retornam diagnósticos sem apagar a fonte. */
  start(source: string, speed: Speed): Result<void>;
  /** Cancela execução e desenho pendentes, invalidando callbacks anteriores. */
  stop(): void;
  /** Observa eventos ordenados; retorna a função de desinscrição do observador. */
  subscribe(listener: (event: RunEvent) => void): () => void;
  /** Libera agendamentos e assinaturas associados à instância. */
  dispose(): void;
}

/** Porta do palco; implementação mantém log e recursos fora do estado React. */
export interface Renderer {
  /** Aplica operações em ordem e atualiza a posição visual do personagem. */
  apply(operations: readonly DrawOp[], turtle: TurtleView): void;
  /** Redesenha o log sem alterar as coordenadas lógicas ao mudar a apresentação. */
  resize(width: number, height: number, pixelRatio: number): void;
  /** Exporta somente o palco como PNG, sem incluir elementos da interface. */
  exportPng(): Promise<Blob>;
  /** Desconecta observadores e libera os recursos da instância. */
  dispose(): void;
}

/** Porta HTTP do cliente; o repositório de arquivos do servidor é separado. */
export interface ShareStore {
  /** Cria uma obra nova e imutável a partir do documento fonte e do palco PNG. */
  create(program: ProgramDocument, png: Blob): Promise<Result<ShareEntry>>;
  /** Lê uma página de resumos; o cursor é opaco e não representa um caminho. */
  list(cursor?: string): Promise<Result<SharePage>>;
  /** Carrega documento validado; sua fonte passa pela mesma análise local. */
  load(id: string): Promise<Result<ShareEntry>>;
}
