import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

if (process.env.PINTEO7_CHROMIUM)
  test.use({ launchOptions: { executablePath: process.env.PINTEO7_CHROMIUM } });

/** Lê linhas do documento CodeMirror sem acrescentar o newline de apresentação de innerText. */
async function source(page: Page): Promise<string> {
  return (await page.locator('.cm-content .cm-line').allTextContents()).join('\n');
}
/** Troca a fonte pelo editor real e mantém o mesmo motor/conversor da composição de produção. */
async function edit(page: Page, text: string): Promise<void> {
  await page.getByRole('tab', { name: 'Código' }).click();
  await page.locator('.cm-content').fill(text);
}
/** Executa a fonte inteira; nenhuma seleção cria execução parcial ou depurador. */
async function run(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Executar', exact: false }).click();
  await expect(page.locator('.execution-meta')).toContainText('Pronto para experimentar');
}

for (const width of [360, 412, 768, 1280]) {
  test(`produto real em ${String(width)} px sem overflow nem erros de console`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (event) => {
      if (event.type() === 'error' || event.type() === 'warning') errors.push(event.text());
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Blocos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('TESTE DE INTERFACE', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Movimento', exact: false }).first().click();
    await page.getByRole('button', { name: 'Para frente', exact: true }).click();
    await page.locator('.block-stack > .drop-slot').first().click();
    await expect(page.locator('[data-block-id]')).toHaveCount(1);
    await expect(page.locator('.toast')).toHaveText('Programa atualizado.');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await run(page);
    await expect(page.locator('.stage-character')).toHaveAttribute('style', /top: 30%/);
    const canvas = await page.locator('canvas').boundingBox();
    const stage = await page.locator('.stage').boundingBox();
    if (!canvas || !stage) throw new Error('Palco não está disponível');
    expect(Math.abs(canvas.width - stage.width)).toBeLessThan(1);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `design/reviews/t-067/${String(width)}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('CLI/comentários usam conversor real integral e recusam recurso sem bloco sem executar', async ({
  page,
}) => {
  await page.goto('/');
  const original = '; meu comentário preservado\nrepeat 4 [fd 40 rt 90]  \n';
  await edit(page, original);
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await expect(page.locator('[data-block-id]')).toHaveCount(3);
  await page.getByRole('tab', { name: 'Código' }).click();
  expect(await source(page)).toBe(original);
  await page.getByRole('tab', { name: 'Blocos' }).click();
  const field = page.getByRole('textbox', { name: 'Valor de para frente', exact: true });
  await field.fill('60');
  await field.press('Enter');
  await page.getByRole('tab', { name: 'Código' }).click();
  expect(await source(page)).toContain('; meu comentário preservado');
  expect(await source(page)).toContain('60');
  const unsupported = '; sem equivalente visual\nforward random 100  \n';
  await edit(page, unsupported);
  const before = await page.locator('canvas').evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Canvas ausente');
    return element.toDataURL();
  });
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await expect(page.getByRole('alert')).toContainText('Seu programa foi preservado');
  await expect(page.getByRole('tab', { name: 'Código' })).toHaveAttribute('aria-selected', 'true');
  expect(await source(page)).toBe(unsupported);
  expect(
    await page.locator('canvas').evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error('Canvas ausente');
      return element.toDataURL();
    }),
  ).toBe(before);
});

test('seleção não limita execução nem transforma seleção em procedimento; sessão/histórico e parada reais', async ({
  page,
}) => {
  await page.goto('/');
  await edit(page, 'forward 40 right 90');
  await page.getByRole('tab', { name: 'Blocos' }).click();
  await page.getByRole('button', { name: 'Selecionar para frente', exact: true }).click();
  await page.getByRole('button', { name: 'Procedimentos', exact: false }).first().click();
  await page.getByRole('button', { name: 'Definir procedimento', exact: true }).click();
  await page.locator('.block-stack > .drop-slot').last().click();
  const definition = page
    .getByRole('group', { name: 'Bloco definir procedimento', exact: true })
    .locator('..');
  await expect(definition.locator('.repeat-body > .block-item')).toHaveCount(0);
  await expect(page.locator('.block-stack > .block-item')).toHaveCount(3);
  await run(page);
  await expect(page.locator('.stage-character')).toHaveAttribute('style', /rotate\(90deg\)/);
  await edit(page, 'make "passos 7 print :passos');
  await run(page);
  await edit(page, 'print :passos');
  await run(page);
  await page.locator('.output summary').click();
  await expect(page.locator('.output > pre')).toContainText('7');
  await expect(page.getByText('3 execuções', { exact: true })).toBeVisible();
  await edit(page, 'repeat 1000000000 [make "passos 1]');
  await page.getByRole('button', { name: 'Executar', exact: false }).click();
  await page.getByRole('button', { name: 'Parar', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Executar', exact: false })).toBeEnabled();
  expect(await source(page)).toBe('repeat 1000000000 [make "passos 1]');
  await page.getByRole('button', { name: 'Limpar', exact: false }).click();
  await expect(page.getByText('0 execuções', { exact: true })).toBeVisible();
});

test('PNG, rede, compartilhamento público, galeria e reload recuperam fonte/personagem/prévia sem executar', async ({
  page,
}) => {
  await page.goto('/');
  const program = '; obra pública de teste\ncolor [118 77 215]\nforward 80 right 90 forward 60\n';
  await edit(page, program);
  await page.getByRole('button', { name: 'QUEM VAI DESENHAR?', exact: false }).click();
  await page.getByRole('button', { name: 'Capivara', exact: true }).click();
  await run(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PNG', exact: false }).click();
  const path = await (await download).path();
  if (!path) throw new Error('PNG não foi baixado');
  expect((await readFile(path)).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let failed = false;
  await page.route('**/api/v1/shares', async (route) => {
    if (route.request().method() === 'POST' && !failed) {
      failed = true;
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Compartilhar', exact: false }).first().click();
  await expect(page.getByRole('dialog')).toContainText('públicos');
  await page.getByRole('button', { name: 'Compartilhar publicamente' }).click();
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeEnabled();
  expect(await source(page)).toBe(program);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  const link = page.getByRole('textbox', { name: 'Link público' });
  await expect(link).toHaveValue(/share=/);
  const sharedUrl = await link.inputValue();
  const id = new URL(sharedUrl).searchParams.get('share');
  if (!id) throw new Error('UUID ausente');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abrir galeria' }).click();
  const ownCard = page.locator(`.gallery-card:has(img[src*="${id}"])`);
  for (let pageNumber = 0; pageNumber < 3 && (await ownCard.count()) === 0; pageNumber++) {
    await expect(page.locator('.gallery-card').first()).toBeVisible();
    const first = await page.locator('.gallery-card img').first().getAttribute('src');
    const next = page.getByRole('button', { name: 'Próxima página' });
    await expect(next).toBeVisible();
    await next.click();
    await expect(page.locator('.gallery-card img').first()).not.toHaveAttribute('src', first ?? '');
  }
  await ownCard.click();
  await expect(page.locator('.shared-preview')).toBeVisible();
  let gets = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === `/api/v1/shares/${id}`) gets++;
  });
  await page.goto(sharedUrl);
  await expect(page.locator('.shared-preview')).toBeVisible();
  await expect(page.locator('.character-bar')).toContainText('Capivara');
  await expect.poll(() => source(page)).toBe(program);
  await expect(page.getByText('0 execuções', { exact: true })).toBeVisible();
  expect(gets).toBe(1);
  const pixel = await page.locator('.shared-preview').evaluate(async (image) => {
    if (!(image instanceof HTMLImageElement)) throw new Error('Prévia ausente');
    await image.decode();
    const bitmap = await createImageBitmap(image);
    const sample = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = sample.getContext('2d');
    if (!context) throw new Error('Contexto ausente');
    context.drawImage(bitmap, 0, 0);
    const pixel = Array.from(
      context.getImageData(Math.floor(bitmap.width * 0.5), Math.floor(bitmap.height * 0.42), 1, 1)
        .data,
    );
    bitmap.close();
    return pixel;
  });
  expect(pixel[0]).toBeLessThan(220);
  const previewDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PNG', exact: false }).click();
  expect((await previewDownload).suggestedFilename()).toBe('pinte-o-7.png');
  await run(page);
  await expect(page.locator('.shared-preview')).toHaveCount(0);
});

test('resposta de link atrasada pede confirmação; erro de link/rede não apaga rascunho', async ({
  page,
  request,
}) => {
  const listed = await request.get('/api/v1/shares');
  const envelope: unknown = await listed.json();
  if (
    typeof envelope !== 'object' ||
    !envelope ||
    !('data' in envelope) ||
    typeof envelope.data !== 'object' ||
    !envelope.data ||
    !('items' in envelope.data) ||
    !Array.isArray(envelope.data.items)
  )
    throw new Error('Galeria inválida');
  const entry: unknown = envelope.data.items[0];
  if (typeof entry !== 'object' || !entry || !('id' in entry) || typeof entry.id !== 'string')
    throw new Error('Galeria vazia');
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/shares/${entry.id}`, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(`/?share=${entry.id}`);
  await edit(page, '; rascunho escrito durante a rede\nprint 42');
  release?.();
  await expect(page.getByRole('dialog', { name: 'Substituir o rascunho?' })).toBeVisible();
  await page.getByRole('button', { name: 'Manter meu rascunho' }).click();
  expect(await source(page)).toBe('; rascunho escrito durante a rede\nprint 42');
  await page.goto('/?share=invalid');
  await expect(page.getByRole('alert')).toContainText('inválido');
  await edit(page, '; ainda posso trabalhar\nprint 7');
  expect(await source(page)).toBe('; ainda posso trabalhar\nprint 7');
});
