import type { Runner, Renderer, ShareStore } from '../application/index.js';
import type { ConversionService } from '../core/program/index.js';

/** Serviços reais são montados pela composição; nenhum fake entra no bootstrap. */
export interface UiServices {
  readonly runner: Runner;
  readonly conversion: ConversionService;
  readonly shares: ShareStore;
  readonly createRenderer: (canvas: HTMLCanvasElement) => Renderer;
}
