import { describe, expect, it, vi } from 'vitest';
import { createRenderer } from '../../src/infrastructure/canvas/index.js';
import { createRunner } from '../../src/application/runner/index.js';

/** Canvas fake estritamente limitado à porta Canvas2D usada pelo adaptador. */
function fakeCanvas(): {
  canvas: HTMLCanvasElement;
  stroke: ReturnType<typeof vi.fn>;
  transform: ReturnType<typeof vi.fn>;
} {
  const stroke = vi.fn(),
    transform = vi.fn();
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: transform,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke,
    lineCap: '',
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
  };
  const canvas = {
    width: 500,
    height: 500,
    clientWidth: 500,
    clientHeight: 500,
    style: {},
    getContext: () => context,
    toBlob: (callback: BlobCallback) => {
      callback(new Blob(['png'], { type: 'image/png' }));
    },
  };
  // A única coerção é a fronteira do fake DOM deliberadamente parcial; produção recebe HTMLCanvasElement real.
  return { canvas: canvas as unknown as HTMLCanvasElement, stroke, transform };
}

describe('adaptador Canvas e fábricas públicas', () => {
  it('redesenha log nas mesmas coordenadas e não inclui sprite na exportação', async () => {
    const fake = fakeCanvas(),
      renderer = createRenderer(fake.canvas);
    renderer.apply(
      [
        {
          kind: 'line',
          from: { x: 250, y: 250 },
          to: { x: 250, y: 240 },
          width: 1,
          color: [0, 0, 0],
        },
      ],
      { position: { x: 250, y: 240 }, heading: 270, visible: true },
    );
    expect(fake.stroke).toHaveBeenCalledTimes(1);
    renderer.resize(1000, 500, 2);
    expect(fake.transform).toHaveBeenCalledWith(2, 0, 0, 2, 500, 0);
    expect(fake.stroke).toHaveBeenCalledTimes(2);
    expect((await renderer.exportPng()).type).toBe('image/png');
    renderer.dispose();
    renderer.dispose();
    await expect(renderer.exportPng()).rejects.toThrow('encerrado');
  });
  it('descarta log anterior quando recebe clear e recusa dimensões inválidas', () => {
    const fake = fakeCanvas(),
      renderer = createRenderer(fake.canvas);
    const state = { position: { x: 250, y: 250 }, heading: 270, visible: true };
    renderer.apply(
      [
        { kind: 'line', from: state.position, to: { x: 250, y: 200 }, width: 1, color: [0, 0, 0] },
        { kind: 'clear' },
      ],
      state,
    );
    renderer.resize(500, 500, 1);
    expect(fake.stroke).toHaveBeenCalledTimes(1);
    expect(() => {
      renderer.resize(0, 1, 1);
    }).toThrow('Dimensões');
    renderer.dispose();
  });
  it('cria runner pronto para composição sem efeitos globais após dispose', () => {
    const runner = createRunner();
    runner.dispose();
    expect(runner.start('forward 1', 'normal')).toMatchObject({ ok: false });
  });
});
