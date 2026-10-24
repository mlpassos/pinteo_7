import { useEffect, useEffectEvent, useRef } from 'react';
import type { Renderer, Runner } from '../application/index.js';
import type { ProgramDocument } from '../shared/index.js';
import { characterUrl } from '../infrastructure/assets/index.js';

/** Canvas mantém operações fora de React; resize altera somente apresentação. */
export function Stage({
  factory,
  runner,
  character,
  ready,
  preview = null,
}: {
  factory: ((canvas: HTMLCanvasElement) => Renderer) | undefined;
  runner: Runner | undefined;
  character: ProgramDocument['characterId'];
  ready: (renderer: Renderer | null) => void;
  preview?: Blob | null;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const previewImage = useRef<HTMLImageElement>(null);
  const sprite = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = previewImage.current;
    if (!preview || !image) return;
    const url = URL.createObjectURL(preview);
    image.src = url;
    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [preview]);
  const onReady = useEffectEvent(ready);
  useEffect(() => {
    const target = canvas.current;
    const container = surface.current;
    if (!target || !container || !factory) return;
    const renderer = factory(target);
    onReady(renderer);
    const unsubscribe = runner?.subscribe((event) => {
      if (event.type !== 'draw') return;
      renderer.apply(event.operations, event.turtle);
      if (sprite.current) {
        sprite.current.style.left = `${String(event.turtle.position.x / 5)}%`;
        sprite.current.style.top = `${String(event.turtle.position.y / 5)}%`;
        sprite.current.style.transform = `translate(-50%, -50%) rotate(${String(event.turtle.heading + 90)}deg)`;
        const { x, y } = event.turtle.position;
        sprite.current.hidden = !event.turtle.visible || x < 0 || x > 500 || y < 0 || y > 500;
      }
    });
    /** Mede o contêiner lógico: o renderer define pixels inline no canvas filho. */
    function resize() {
      const current = surface.current;
      if (!current) return;
      const bounds = current.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0)
        renderer.resize(bounds.width, bounds.height, window.devicePixelRatio);
    }
    let resolution = window.matchMedia(`(resolution: ${String(window.devicePixelRatio)}dppx)`);
    /** Reinscreve a consulta quando o monitor muda sem alterar o tamanho CSS. */
    function resolutionChanged() {
      resolution.removeEventListener('change', resolutionChanged);
      resize();
      resolution = window.matchMedia(`(resolution: ${String(window.devicePixelRatio)}dppx)`);
      resolution.addEventListener('change', resolutionChanged);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resolution.addEventListener('change', resolutionChanged);
    window.addEventListener('resize', resize);
    resize();
    return () => {
      observer.disconnect();
      resolution.removeEventListener('change', resolutionChanged);
      window.removeEventListener('resize', resize);
      unsubscribe?.();
      renderer.dispose();
      onReady(null);
    };
  }, [factory, runner]);
  return (
    <div className="stage-wrap">
      <div ref={surface} className="stage" aria-label="Palco de desenho, 500 por 500 unidades">
        <canvas ref={canvas} width={500} height={500} aria-label="Desenho do programa LOGO" />
        {preview && (
          <img
            ref={previewImage}
            className="shared-preview"
            alt="Desenho compartilhado, sem executar o programa"
          />
        )}
        <img
          ref={sprite}
          className="stage-character"
          src={characterUrl(character)}
          alt=""
          width={40}
          height={40}
        />
      </div>
      <div className="stage-caption">
        <span>Palco · 500 × 500</span>
        <span>{factory ? 'Seu programa ganha forma' : 'Aguardando motor'}</span>
      </div>
    </div>
  );
}
