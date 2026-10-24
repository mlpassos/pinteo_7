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
}: {
  factory: ((canvas: HTMLCanvasElement) => Renderer) | undefined;
  runner: Runner | undefined;
  character: ProgramDocument['characterId'];
  ready: (renderer: Renderer | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sprite = useRef<HTMLImageElement>(null);
  const onReady = useEffectEvent(ready);
  useEffect(() => {
    const target = canvas.current;
    if (!target || !factory) return;
    const renderer = factory(target);
    onReady(renderer);
    const unsubscribe = runner?.subscribe((event) => {
      if (event.type !== 'draw') return;
      renderer.apply(event.operations, event.turtle);
      if (sprite.current) {
        sprite.current.style.left = `${String(event.turtle.position.x / 5)}%`;
        sprite.current.style.top = `${String(event.turtle.position.y / 5)}%`;
        sprite.current.style.transform = `translate(-50%, -50%) rotate(${String(event.turtle.heading + 90)}deg)`;
        sprite.current.hidden = !event.turtle.visible;
      }
    });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry)
        renderer.resize(entry.contentRect.width, entry.contentRect.height, window.devicePixelRatio);
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
      unsubscribe?.();
      renderer.dispose();
      onReady(null);
    };
  }, [factory, runner]);
  return (
    <div className="stage-wrap">
      <div className="stage" aria-label="Palco de desenho, 500 por 500 unidades">
        <canvas ref={canvas} width={500} height={500} aria-label="Desenho do programa LOGO" />
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
