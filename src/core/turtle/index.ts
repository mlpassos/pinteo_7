import type { RGB } from '../common/index.js';

/** Ponto em coordenadas lógicas do palco legado, de 500 × 500 unidades. */
export type Point = Readonly<{ x: number; y: number }>;

/** Operação de desenho independente de DOM, canvas e agendamento. */
export type DrawOp =
  | Readonly<{ kind: 'line'; from: Point; to: Point; width: number; color: RGB }>
  | Readonly<{
      kind: 'arc';
      center: Point;
      radius: number;
      start: number;
      end: number;
      width: number;
      color: RGB;
    }>
  | Readonly<{ kind: 'clear' }>;

/** Estado de apresentação do personagem nas coordenadas lógicas do motor. */
export type TurtleView = Readonly<{
  position: Point;
  heading: number;
  visible: boolean;
}>;

export { Turtle } from './turtle.js';
