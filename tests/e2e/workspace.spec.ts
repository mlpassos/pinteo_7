import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { fileURLToPath } from 'node:url';

if (process.env.PINTEO7_CHROMIUM)
  test.use({ launchOptions: { executablePath: process.env.PINTEO7_CHROMIUM } });
const harness = '/@fs' + fileURLToPath(new URL('../ui/index.html', import.meta.url));

/** Acessa somente harness de teste, explicitamente fora do bootstrap/artefato. */
async function open(page: Page) {
  await page.goto(harness);
  await expect(page.getByText('TESTE DE INTERFACE', { exact: false })).toBeVisible();
}
/** Arraste por Pointer Events, sem depender do DnD HTML sem suporte a toque. */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error('Destino de arraste ausente');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

for (const width of [360, 412, 768, 1280]) {
  test(`layout, recursos locais e diálogo por teclado em ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (event) => {
      if (event.type() === 'error' || event.type() === 'warning') errors.push(event.text());
    });
    await open(page);
    await page.getByRole('tab', { name: 'Blocos' }).click();
    await expect(page.locator('[data-block-id]')).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const canvas = await page.locator('canvas').boundingBox();
    expect(canvas).not.toBeNull();
    if (canvas) expect(Math.abs(canvas.width - canvas.height)).toBeLessThan(1);
    await page.screenshot({ path: `design/reviews/t-066/${String(width)}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Movimento', exact: false }).first().click();
    await expect(page.getByRole('button', { name: 'Para frente', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({
      path: `design/reviews/t-066/${String(width)}-comandos.png`,
      fullPage: true,
    });
    const help = page.getByRole('button', { name: 'Abrir ajuda' });
    await help.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect
      .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('dialog'))))
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(help).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test('editor estável preserva texto/comentários ao recusar conversão', async ({ page }) => {
  await open(page);
  const editor = page.locator('.cm-content');
  const previous = await editor.elementHandle();
  const source = '; meu comentário\nforward random 100  \n';
  await editor.fill(source);
  await page.getByRole('button', { name: 'Abrir ajuda' }).click();
  await page.keyboard.press('Escape');
  expect(
    await previous.evaluate((element) => element === document.querySelector('.cm-content')),
  ).toBe(true);
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await expect(page.getByRole('alert')).toContainText('Seu programa foi preservado');
  await expect(page.getByRole('tab', { name: 'Código' })).toHaveAttribute('aria-selected', 'true');
  expect((await editor.locator('.cm-line').allTextContents()).join('\n')).toBe(source);
  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await page.getByRole('button', { name: 'Manter meu rascunho' }).click();
  expect((await editor.locator('.cm-line').allTextContents()).join('\n')).toBe(source);
});

test('encaixe aninhado por teclado, expressão em slot, reordenação e recusa de ciclo', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await page.getByRole('button', { name: 'Movimento', exact: false }).first().click();
  await page.getByRole('button', { name: 'Para frente', exact: true }).focus();
  await page.keyboard.press('Enter');
  const slot = page.locator('[data-block-id="loop"] > .repeat-body > .drop-slot').last();
  await slot.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-block-id]')).toHaveCount(4);
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.matches('.code-block'))))
    .toBe(true);
  await page.getByRole('button', { name: 'Operadores', exact: false }).first().click();
  await page.getByRole('button', { name: 'Soma', exact: true }).click();
  await page
    .getByRole('button', { name: 'Encaixar expressão em Valor de para frente', exact: true })
    .first()
    .click();
  await expect(page.locator('.expression')).toHaveCount(1);
  const right = page.locator('[data-block-id="right"] > .code-block');
  await right.focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(right).toBeFocused();
  await expect(
    page.locator('[data-block-id="loop"] > .repeat-body > .block-item').first(),
  ).toHaveAttribute('data-block-id', 'right');
  await page.getByRole('button', { name: 'Mover repetir para um encaixe', exact: true }).click();
  await page.locator('[data-block-id="loop"] > .repeat-body > .drop-slot').first().click();
  await expect(page.getByRole('alert')).toContainText('dentro dela mesma');
  await expect(page.locator('[data-block-id]')).toHaveCount(4);
});

test('arraste mouse insere no corpo; cancelamento mantém a árvore; expressão arrastável', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await open(page);
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await page.getByRole('button', { name: 'Movimento', exact: false }).first().click();
  await drag(
    page,
    page.getByRole('button', { name: 'Arrastar Para frente', exact: true }),
    page.locator('[data-block-id="loop"] > .repeat-body > .drop-slot').last(),
  );
  await expect(page.locator('[data-block-id]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Operadores', exact: false }).first().click();
  await page.getByRole('button', { name: 'Soma', exact: true }).click();
  await drag(
    page,
    page.getByRole('button', { name: 'Arrastar Soma', exact: true }),
    page
      .getByRole('button', { name: 'Encaixar expressão em Valor de para frente', exact: true })
      .first(),
  );
  await expect(page.locator('.expression')).toHaveCount(1);
  const grip = page.getByRole('button', { name: 'Arrastar repetir', exact: true });
  const bounds = await grip.boundingBox();
  if (!bounds) throw new Error('Alça ausente');
  await page.mouse.move(bounds.x + 8, bounds.y + 8);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 20, bounds.y + 60);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('[data-block-id]')).toHaveCount(4);
});

test('rede, tentativa novamente, personagem e PNG preservam o programa', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'QUEM VAI DESENHAR?', exact: false }).click();
  await expect(page.locator('.characters-grid button')).toHaveCount(21);
  await page.getByRole('button', { name: 'Capivara', exact: true }).click();
  await expect(page.locator('.character-bar')).toContainText('Capivara');
  await page.getByRole('button', { name: 'Executar', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Parar', exact: false })).toBeEnabled();
  await page.getByRole('button', { name: 'Parar', exact: false }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PNG', exact: false }).click();
  expect((await download).suggestedFilename()).toBe('pinte-o-7.png');
  await page.getByRole('button', { name: 'Compartilhar', exact: false }).first().click();
  await expect(page.getByRole('dialog')).toContainText('públicos');
  await page.getByRole('button', { name: 'Compartilhar publicamente' }).click();
  await expect(page.getByRole('dialog')).toContainText('Falha de rede de teste');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Link público' })).toHaveValue(/share=fa5774ab/);
});

test('toque emulado arrasta e encaixa; movimento reduzido desliga animação de encaixe', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 412, height: 1200 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await open(page);
  await page.getByRole('tab', { name: 'Blocos' }).tap();
  await page.getByRole('button', { name: 'Movimento', exact: false }).first().tap();
  const source = await page
    .getByRole('button', { name: 'Arrastar Para frente', exact: true })
    .boundingBox();
  const target = await page.locator('.block-stack > .drop-slot').first().boundingBox();
  if (!source || !target) throw new Error('Alças de toque indisponíveis');
  const client = await context.newCDPSession(page);
  const from = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const to = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 12; i++)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: from.x + ((to.x - from.x) * i) / 12, y: from.y + ((to.y - from.y) * i) / 12 },
      ],
    });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-block-id]')).toHaveCount(4);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await context.close();
});

test('Limpar reinicia sessão e histórico e conserva a fonte', async ({ page }) => {
  await open(page);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Executar', exact: false }).click();
    await page.getByRole('button', { name: 'Parar', exact: false }).click();
  }
  await expect(page.getByText('2 execuções', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar', exact: false }).click();
  await expect(page.getByText('0 execuções', { exact: true })).toBeVisible();
  expect((await page.locator('.cm-line').allTextContents()).join('\n')).toContain(
    '; Fonte preservada no teste',
  );
});

test('abrir galeria pede confirmação e mantém rascunho quando cancelado', async ({ page }) => {
  await page.route('**/api/v1/shares/*/preview.png', async (route) => {
    await route.fulfill({
      path: fileURLToPath(new URL('../../images/personagens/capivara.png', import.meta.url)),
      contentType: 'image/png',
    });
  });
  await open(page);
  const source = '; meu rascunho\nprint 42';
  await page.locator('.cm-content').fill(source);
  await page.getByRole('button', { name: 'Abrir galeria' }).click();
  await page.locator('.gallery-card').click();
  await expect(page.getByRole('dialog')).toContainText('Substituir o rascunho?');
  await page.getByRole('button', { name: 'Manter meu rascunho' }).click();
  expect((await page.locator('.cm-line').allTextContents()).join('\n')).toBe(source);
  await page.getByRole('button', { name: 'Abrir galeria' }).click();
  await page.locator('.gallery-card').click();
  await page.getByRole('button', { name: 'Substituir rascunho', exact: true }).click();
  expect((await page.locator('.cm-line').allTextContents()).join('\n')).toContain(
    '; Fonte preservada no teste',
  );
  await expect(page.locator('.character-bar')).toContainText('Capivara');
});

test('Escape cancela campo sem confirmar o valor nem reformatar a fonte', async ({ page }) => {
  await open(page);
  const original = (await page.locator('.cm-line').allTextContents()).join('\n');
  await page.getByRole('tab', { name: 'Blocos' }).click();
  const field = page.getByRole('textbox', { name: 'Valor de para frente', exact: true });
  await field.fill('999');
  await field.press('Escape');
  await expect(field).toHaveValue('100');
  await field.focus();
  await field.press('Tab');
  await page.getByRole('tab', { name: 'Código' }).click();
  expect((await page.locator('.cm-line').allTextContents()).join('\n')).toBe(original);
});

test('som original no encaixe e preferência de silêncio; resize conserva coordenadas e fonte', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalAudio = Audio;
    window.Audio = class extends OriginalAudio {
      /** Observa reprodução real sem substituir play nem os arquivos originais. */
      constructor(source?: string) {
        super(source);
        this.addEventListener('play', () => {
          document.documentElement.dataset.testAudioCalls = String(
            Number(document.documentElement.dataset.testAudioCalls ?? '0') + 1,
          );
          document.documentElement.dataset.testAudioSource = this.src;
        });
      }
    };
  });
  await open(page);
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await page.getByRole('button', { name: 'Movimento', exact: false }).first().click();
  await page.getByRole('button', { name: 'Para frente', exact: true }).click();
  await page.locator('.block-stack > .drop-slot').last().click();
  await expect(page.locator('html')).toHaveAttribute('data-test-audio-calls', '1');
  await expect(page.locator('html')).toHaveAttribute(
    'data-test-audio-source',
    /sounds\/click\.mp3/,
  );
  await page.getByRole('button', { name: 'Som ligado', exact: false }).click();
  await page.getByRole('button', { name: 'Para frente', exact: true }).click();
  await page.locator('.block-stack > .drop-slot').last().click();
  await expect(page.locator('html')).toHaveAttribute('data-test-audio-calls', '1');
  await page.getByRole('button', { name: 'Executar', exact: false }).click();
  await expect(page.locator('.stage-character')).toHaveCSS('top', /px/);
  const position = await page
    .locator('.stage-character')
    .evaluate((element) => element.getAttribute('style'));
  await page.setViewportSize({ width: 412, height: 1000 });
  expect(await page.locator('.stage-character').getAttribute('style')).toBe(position);
  await page.getByRole('button', { name: 'Parar', exact: false }).click();
  await page.getByRole('tab', { name: 'Código' }).click();
  expect((await page.locator('.cm-line').allTextContents()).join('\n')).toContain(
    '; Fonte preservada no teste',
  );
});
