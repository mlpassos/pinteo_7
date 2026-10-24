// Geometria derivada do Papert, licença MIT em Papert-License.txt.
import type { RGB } from '../common/index.js';
import type { DrawOp, TurtleView } from './index.js';

/** Estado geométrico puro da tartaruga, independente do agendamento e da apresentação. */
export class Turtle {
  private x = 250;
  private y = 250;
  private heading = 270;
  private visible = true;
  private pen = true;
  private width = 1;
  private color: RGB = [0, 0, 0];
  /** Observa somente operações aceitas, em coordenadas lógicas do Papert. */
  constructor(private readonly emit: (operation: DrawOp) => void) {}
  /** Obtém uma cópia do estado de apresentação, sem permitir mutação do motor. */
  view(): TurtleView {
    return { position: { x: this.x, y: this.y }, heading: this.heading, visible: this.visible };
  }
  /** Move com a pena atual, conservando a geometria trigonométrica original. */
  forward(distance: number): void {
    const from = { x: this.x, y: this.y };
    const radians = (this.heading / 180) * Math.PI;
    this.x += distance * Math.cos(radians);
    this.y += distance * Math.sin(radians);
    if (this.pen)
      this.emit({
        kind: 'line',
        from,
        to: { x: this.x, y: this.y },
        width: this.width,
        color: this.color,
      });
  }
  /** Aplica comando geométrico ou configuração validada pelo interpretador. */
  execute(name: string, args: readonly number[]): void {
    const a = args[0] ?? 0,
      b = args[1] ?? 0;
    switch (name) {
      case 'forward':
        this.forward(a);
        break;
      case 'backward':
        this.forward(-a);
        break;
      case 'right':
        this.heading = (this.heading + a) % 360;
        break;
      case 'left':
        this.heading = (this.heading - a) % 360;
        break;
      case 'setx':
        this.x = a;
        break;
      case 'sety':
        this.y = a;
        break;
      case 'setxy':
      case 'setpos':
        this.x = a;
        this.y = b;
        break;
      case 'setheading':
        this.heading = (270 + a) % 360;
        break;
      case 'penup':
        this.pen = false;
        break;
      case 'pendown':
        this.pen = true;
        break;
      case 'penwidth':
        this.width = a;
        break;
      case 'color':
        this.color = [Math.trunc(a), Math.trunc(b), Math.trunc(args[2] ?? 0)];
        break;
      case 'showturtle':
        this.visible = true;
        break;
      case 'hideturtle':
        this.visible = false;
        break;
      case 'home':
        this.x = 250;
        this.y = 250;
        this.heading = 270;
        break;
      case 'clearscreen':
        this.emit({ kind: 'clear' });
        this.execute('home', []);
        break;
      case 'reset':
        this.emit({ kind: 'clear' });
        this.execute('home', []);
        this.pen = true;
        this.width = 1;
        this.color = [0, 0, 0];
        break;
      case 'clean':
      case 'undo':
      case 'redo':
        break;
      case 'circle':
      case 'arc':
        if (this.pen)
          this.emit({
            kind: 'arc',
            center: { x: this.x, y: this.y },
            radius: a,
            start: name === 'circle' ? 0 : (this.heading / 180) * Math.PI,
            end: name === 'circle' ? 2 * Math.PI : (((this.heading + b) % 360) / 180) * Math.PI,
            width: this.width,
            color: this.color,
          });
        break;
      default:
        throw new Error(`Comando geométrico desconhecido: ${name}`);
    }
  }
}
