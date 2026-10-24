// Harness local de evidência: Node + Chromium reais, sem substituir timers de navegador.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await createServer({ server: { port: 5181, strictPort: true, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PINTEO7_CHROMIUM_BIN ? { executablePath: process.env.PINTEO7_CHROMIUM_BIN } : {}),
});
const page = await browser.newPage({
  viewport: { width: 1100, height: 950 },
  deviceScaleFactor: 2,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`http://127.0.0.1:5181/@fs/${root}design/reviews/t-063/harness.html`);
  await page.waitForFunction(() => Boolean(window.harness));
  const cancellations = [];
  for (const source of [
    'forever []',
    'repeat 1000000000 []',
    'to recurse repeat 1000 [] recurse end recurse',
  ]) {
    const result = await page.evaluate(async (source) => {
      const h = window.harness;
      h.reset();
      const start = performance.now();
      h.runner.start(source, 'fast');
      return new Promise((resolve) =>
        setTimeout(() => {
          const runningBefore = h.getEvents().at(-1)?.status === 'running';
          const before = performance.now();
          document.querySelector('#stop').click();
          const after = performance.now();
          resolve({
            source,
            runningBefore,
            timerDelay: before - start - 30,
            cancelDuration: after - before,
            status: h.getEvents().at(-1),
            events: h.getEvents().length,
          });
        }, 30),
      );
    }, source);
    if (
      !result.runningBefore ||
      result.timerDelay > 250 ||
      result.cancelDuration > 250 ||
      result.status?.status !== 'idle'
    )
      throw new Error('Cancelamento fora do limite: ' + JSON.stringify(result));
    cancellations.push(result);
  }
  const speeds = [];
  for (const speed of ['slow', 'normal', 'fast']) {
    await page.evaluate((speed) => {
      const h = window.harness;
      h.reset();
      h.label('Velocidade: ' + speed);
      h.runner.start(
        'color [224 83 64] repeat 36 [forward 3 right 10] color [32 145 131] circle 100 forward 1.5',
        speed,
      );
    }, speed);
    await page.waitForFunction(() => window.harness.getEvents().at(-1)?.status === 'idle');
    const view = await page.evaluate(() => window.harness.getView());
    speeds.push({ speed, view });
  }
  if (
    JSON.stringify(speeds[0].view) !== JSON.stringify(speeds[1].view) ||
    JSON.stringify(speeds[1].view) !== JSON.stringify(speeds[2].view)
  )
    throw new Error('Velocidades alteraram geometria');
  const resize = await page.evaluate(async () => {
    const h = window.harness,
      before = JSON.stringify(h.getView());
    h.renderer.resize(800, 400, 2);
    const ink = Array.from(h.canvas.getContext('2d').getImageData(797, 237, 7, 7).data);
    const green = ink.some(
      (value, index) =>
        index % 4 === 0 && value < 220 && ink[index + 1] < 230 && ink[index + 2] < 220,
    );
    const first = {
      circleInk: green,
      width: h.canvas.width,
      height: h.canvas.height,
      sprite: {
        left: h.sprite.style.left,
        top: h.sprite.style.top,
        transform: h.sprite.style.transform,
      },
    };
    h.renderer.resize(500, 500, 2);
    const png = await h.renderer.exportPng();
    return {
      before,
      after: JSON.stringify(h.getView()),
      first,
      png: { type: png.type, bytes: png.size },
      final: { width: h.canvas.width, height: h.canvas.height },
    };
  });
  if (
    resize.before !== resize.after ||
    resize.png.type !== 'image/png' ||
    resize.png.bytes === 0 ||
    !resize.first.circleInk
  )
    throw new Error('Resize/exportação inválidos');
  await page.evaluate((root) => {
    window.harness.sprite.src = '/@fs/' + root + 'images/personagens/tartaruga.png';
  }, root);
  await page.waitForFunction(
    () => window.harness.sprite.complete && window.harness.sprite.naturalWidth === 128,
  );
  const characterBefore = await page.evaluate(() => JSON.stringify(window.harness.getView()));
  await page.evaluate((root) => {
    window.harness.sprite.src = '/@fs/' + root + 'images/personagens/robo-quadrado.png';
  }, root);
  await page.waitForFunction(
    () => window.harness.sprite.complete && window.harness.sprite.naturalWidth === 128,
  );
  if (characterBefore !== (await page.evaluate(() => JSON.stringify(window.harness.getView()))))
    throw new Error('Personagem alterou geometria');
  const report = { browser: browser.version(), cancellations, speeds, resize, pageErrors: errors };
  if (errors.length) throw new Error(JSON.stringify(errors));
  await page.evaluate((report) => window.harness.report(report), report);
  await mkdir(`${root}design/reviews/t-063`, { recursive: true });
  await page.screenshot({
    path: `${root}design/reviews/t-063/canvas-chromium.png`,
    fullPage: true,
  });
  await writeFile(
    `${root}docs/evidencias/t-063/browser.json`,
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await server.close();
}
