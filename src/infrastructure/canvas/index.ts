import type { Renderer } from '../../application/index.js';
import type { DrawOp, TurtleView } from '../../core/turtle/index.js';

/** Renderer Canvas com coordenadas lógicas fixas, log limitado e sprite de apresentação opcional. */
class CanvasRenderer implements Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly log: DrawOp[] = [];
  private view: TurtleView = { position: { x: 250, y: 250 }, heading: 270, visible: true };
  private disposed = false;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  /** Recebe canvas e sprite existente; escolha de personagem altera somente src do elemento. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sprite?: HTMLElement,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D indisponível.');
    this.context = context;
    this.resize(
      canvas.clientWidth || 500,
      canvas.clientHeight || 500,
      globalThis.devicePixelRatio || 1,
    );
  }
  /** Limpa pixels e conserva fundo branco também no PNG exportado. */
  private clearPixels(): void {
    const context = this.context;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    context.restore();
  }
  /** Aplica uma operação sem armazenar estado de negócio em componentes. */
  private paint(operation: DrawOp): void {
    const context = this.context;
    if (operation.kind === 'clear') {
      this.clearPixels();
      return;
    }
    context.save();
    context.beginPath();
    context.rect(0, 0, 500, 500);
    context.clip();
    context.beginPath();
    context.lineCap = 'round';
    context.lineWidth = operation.width;
    context.strokeStyle = `rgb(${operation.color.join(',')})`;
    if (operation.kind === 'line') {
      context.moveTo(operation.from.x, operation.from.y);
      context.lineTo(operation.to.x, operation.to.y);
    } else
      context.arc(
        operation.center.x,
        operation.center.y,
        operation.radius,
        operation.start,
        operation.end,
        false,
      );
    context.stroke();
    context.restore();
  }
  /** Atualiza somente apresentação do personagem; orientação inicial aponta para o topo. */
  private updateSprite(): void {
    if (!this.sprite) return;
    const { position, heading, visible } = this.view;
    this.sprite.hidden =
      !visible || position.x < 0 || position.y < 0 || position.x > 500 || position.y > 500;
    this.sprite.style.position = 'absolute';
    this.sprite.style.left = `${String(this.offsetX + position.x * this.scale)}px`;
    this.sprite.style.top = `${String(this.offsetY + position.y * this.scale)}px`;
    this.sprite.style.transform = `translate(-50%, -50%) rotate(${String(heading + 90)}deg)`;
  }
  /** Aplica operações aceitas e estado do personagem em ordem. */
  apply(operations: readonly DrawOp[], turtle: TurtleView): void {
    if (this.disposed) return;
    for (const operation of operations) {
      if (operation.kind === 'clear') this.log.length = 0;
      else if (this.log.length >= 100000) throw new Error('O palco excedeu o limite de desenho.');
      this.paint(operation);
      if (operation.kind !== 'clear') this.log.push(operation);
    }
    this.view = turtle;
    this.updateSprite();
  }
  /** Redesenha o log com letterboxing e DPR sem alterar posição ou geometria LOGO. */
  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) return;
    if (![width, height, pixelRatio].every((value) => Number.isFinite(value) && value > 0))
      throw new Error('Dimensões do palco inválidas.');
    const ratio = Math.min(
      pixelRatio,
      4,
      2048 / Math.min(width, 4096),
      2048 / Math.min(height, 4096),
    );
    const w = Math.min(width, 4096),
      h = Math.min(height, 4096);
    this.canvas.width = Math.round(w * ratio);
    this.canvas.height = Math.round(h * ratio);
    this.canvas.style.width = `${String(w)}px`;
    this.canvas.style.height = `${String(h)}px`;
    this.scale = Math.min(w, h) / 500;
    this.offsetX = (w - 500 * this.scale) / 2;
    this.offsetY = (h - 500 * this.scale) / 2;
    this.context.setTransform(
      this.scale * ratio,
      0,
      0,
      this.scale * ratio,
      this.offsetX * ratio,
      this.offsetY * ratio,
    );
    this.clearPixels();
    for (const operation of this.log) this.paint(operation);
    this.updateSprite();
  }
  /** Exporta pixels do palco; o sprite e elementos de interface permanecem fora. */
  exportPng(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (this.disposed) {
        reject(new Error('O palco já foi encerrado.'));
        return;
      }
      this.canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Não foi possível exportar o desenho.'));
      }, 'image/png');
    });
  }
  /** Libera log e referência de apresentação; chamadas posteriores são inertes. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.log.length = 0;
  }
}
/** Cria o renderer da composição de UI, sem dependências globais ou observadores ocultos. */
export function createRenderer(canvas: HTMLCanvasElement, sprite?: HTMLElement): Renderer {
  return new CanvasRenderer(canvas, sprite);
}
