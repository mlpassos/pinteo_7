import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  auditLegacyPair,
  CP7_LIMITS,
  importLegacyCp7,
} from '../../src/infrastructure/legacy-import/index.js';
import { programDocumentSchema } from '../../src/shared/index.js';

const fileSchema = z.strictObject({ path: z.string(), bytes: z.number(), sha256: z.string() });
const originalsSchema = z.object({
  version: z.literal(1),
  examples: z
    .array(z.strictObject({ id: z.string(), files: z.array(fileSchema).length(3) }))
    .length(34),
});
const catalogSchema = z.strictObject({
  formatVersion: z.literal(1),
  examples: z
    .array(
      z.strictObject({
        id: z.string().regex(/^example-[0-9]{2}$/),
        title: z.string(),
        programFile: z.string().regex(/^example-[0-9]{2}\.program\.json$/),
        previewFile: z.string().regex(/^example-[0-9]{2}\.png$/),
      }),
    )
    .length(34),
});
const reportSchema = z.object({
  formatVersion: z.literal(1),
  examples: z
    .array(
      z.object({
        id: z.string(),
        originalId: z.string(),
        originals: z.array(fileSchema).length(3),
        destination: z.object({
          programFile: z.string(),
          programSha256: z.string(),
          sourceSha256: z.string(),
          previewFile: z.string(),
          previewSha256: z.string(),
          previewBytes: z.number(),
        }),
        comparison: z.enum(['equivalent-ast', 'different-ast']),
        differences: z.array(z.object({ path: z.string(), txt: z.unknown(), cp7: z.unknown() })),
        resolution: z.string(),
        bareVariables: z.array(z.string()),
        orphanExpressions: z.array(z.string()),
        cp7Source: z.string(),
      }),
    )
    .length(34),
});

const preserved = 'tests/fixtures/legacy/originals/';
const generated = 'src/infrastructure/legacy-import/generated/';

/** Calcula hash sem normalizar os bytes para detectar alterações nos originais. */
function hash(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Peça mínima do dialeto, sem DOM ou dependência de navegador. */
function movement(value: string): string {
  return `<li class="editable funcao-movimento codeblocks-list-item" data-code="forward" data-amount="${value}"><div class="numero">${value}</div></li>`;
}

describe('dialeto CP7 inerte, integral e limitado', () => {
  it('extrai estrutura sem tags e interpreta variáveis nuas de slots como referências', () => {
    const result = importLegacyCp7(movement('tamanho * 2'));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Importação falhou.');
    expect(result.value).toMatchObject({
      source: 'forward (:tamanho * 2)',
      bareVariables: ['tamanho'],
      orphanExpressions: [],
    });
    expect(result.value.statements).toEqual([
      { kind: 'instruction', source: 'forward (:tamanho * 2)' },
    ]);
    expect(JSON.stringify(result.value)).not.toContain('<li');
  });

  it('normaliza infixos sem executar o programa ou alterar TXT canônico', () => {
    const txt = '; manter comentário\r\nfw product :tamanho 2  \n';
    const result = auditLegacyPair(txt, movement('tamanho * 2'));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Auditoria falhou.');
    expect(result.value.comparison).toBe('equivalent-ast');
    expect(result.value.program.source).toBe(txt);
    expect(result.value.differences).toEqual([]);
  });

  it('expõe diferenças reais de dados e conserva operadores soltos somente na auditoria', () => {
    const result = auditLegacyPair(
      'forward 2',
      `${movement('1')}<li class="funcao-operadores codeblocks-list-item-alt" data-code="sum" data-valor1="2" data-valor2="2"></li>`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Auditoria falhou.');
    expect(result.value.comparison).toBe('different-ast');
    expect(result.value.program.source).toBe('forward 2');
    expect(result.value.differences).toHaveLength(2);
    expect(result.value.cp7.orphanExpressions).toEqual(['sum 2 2']);
    expect(result.value.cp7.statements.at(-1)?.kind).toBe('orphan-expression');
  });

  it.each([
    '<script>globalThis.pinteo7Importou=true</script>',
    '<img src="https://invasor.invalid/a.png">',
    '<iframe src="file:///etc/passwd"></iframe>',
    '<svg><script>alert(1)</script></svg>',
    '<!DOCTYPE html [<!ENTITY x SYSTEM "file:///etc/passwd">]>',
    '<!-- comentário HTML fora do dialeto -->',
    '<li data-code="reset" onclick="alert(1)"></li>',
    '<li data-code="reset" OnMouseOver="alert(1)"></li>',
    '<li data-code="reset" style="background-image: url(https://invasor.invalid)"></li>',
    '<li data-code="reset" style="position: relative; behavior: url(x)"></li>',
    '<li data-code="reset" style="width: expression(alert(1))"></li>',
    '<li data-code="reset" style="position: fixed"></li>',
    '<li data-code="reset" style="background-color: rgb(999, 0, 0)"></li>',
    '<li data-code="reset" class="arbitraria"></li>',
    '<li data-code="reset" data-code="forward"></li>',
    '<li data-code="reset" href="javascript:alert(1)"></li>',
    '<li data-code="reset" id="../../segredo"></li>',
    '<li data-code="reset"><span data-value="javascript:alert(1)"></span></li>',
    '<li data-code="reset"><div data-valor1="https://invasor.invalid"></div></li>',
    '<li data-code="forward" data-amount="1 print 2"></li>',
    '<li data-code="forward" data-amount="&quot;x"></li>',
    '<li data-code="reset" data-what="x&#10;"></li>',
    '<li data-code="reset"><div><li data-code="reset"></li></div></li>',
    '<li data-code="reset"><ol><li data-code="reset"></li></ol></li>',
    '<li data-code="repeat" data-loops="3"></li>',
    '<li data-code="reset"/>',
    '<li data-code="reset"></div>',
    '<li data-code="reset">',
    '<li data-code=reset></li>',
    '<li data-code="reset">&entidade_externa;</li>',
    '<div data-code="reset"></div>',
    'texto perdido<li data-code="reset"></li>',
    '<li data-code="reset"><br onclick="alert(1)"></li>',
  ])('recusa o arquivo integralmente: %s', (source) => {
    expect(importLegacyCp7(source)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'CP7_REJECTED' }],
    });
    expect(globalThis).not.toHaveProperty('pinteo7Importou');
  });

  it('não retorna parte segura quando conteúdo proibido aparece depois dela', () => {
    const result = importLegacyCp7(`${movement('2')}<script>erro</script>`);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('value');
  });

  it('recusa limites de bytes, profundidade, elementos, atributos e expressões', () => {
    expect(importLegacyCp7(' '.repeat(CP7_LIMITS.bytes + 1)).ok).toBe(false);
    expect(
      importLegacyCp7(`<li data-code="reset">${'<div>'.repeat(70)}${'</div>'.repeat(70)}</li>`).ok,
    ).toBe(false);
    expect(
      importLegacyCp7(`<li data-code="reset">${'<span></span>'.repeat(CP7_LIMITS.elements)}</li>`)
        .ok,
    ).toBe(false);
    expect(
      importLegacyCp7(`<li data-code="reset" title="${'a'.repeat(CP7_LIMITS.attribute + 1)}"></li>`)
        .ok,
    ).toBe(false);
    expect(importLegacyCp7(movement('1'.repeat(1025))).ok).toBe(false);
  });
});

describe('rastreabilidade dos 34 conjuntos, sem regenerar evidências', () => {
  it('conserva bytes/hashes de todos os originais e prepara destinos fonte/PNG seguros', async () => {
    const manifest = originalsSchema.parse(
      JSON.parse(await readFile('tests/fixtures/legacy/manifest.json', 'utf8')) as unknown,
    );
    const catalogBytes = await readFile(`${generated}manifest.json`);
    const catalog = catalogSchema.parse(JSON.parse(catalogBytes.toString('utf8')) as unknown);
    const report = reportSchema.parse(
      JSON.parse(
        await readFile('docs/evidencias/t-064/manifesto-importacao.json', 'utf8'),
      ) as unknown,
    );
    expect(new Set(catalog.examples.map((example) => example.id)).size).toBe(34);
    expect(catalogBytes.toString('utf8')).not.toMatch(
      /NomeDoAluno|2015|2016|compartilhados-code|\.cp7/,
    );
    expect(await readdir(generated)).toHaveLength(69);

    for (const [index, example] of manifest.examples.entries()) {
      const destination = catalog.examples[index],
        evidence = report.examples[index];
      if (!destination || !evidence) throw new Error('Conjunto sem destino.');
      expect(evidence.originalId).toBe(example.id);
      expect(evidence.id).toBe(destination.id);
      expect(evidence.originals).toEqual(example.files);
      const originalBytes: Buffer[] = [];
      for (const file of example.files) {
        const bytes = await readFile(`${preserved}${file.path}`);
        expect(bytes.length).toBe(file.bytes);
        expect(hash(bytes)).toBe(file.sha256);
        expect((await readFile(file.path)).equals(bytes)).toBe(true);
        originalBytes.push(bytes);
      }
      const [txt, cp7, png] = originalBytes;
      if (!txt || !cp7 || !png) throw new Error('Trio incompleto.');
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const audited = auditLegacyPair(decoder.decode(txt), decoder.decode(cp7));
      if (!audited.ok) throw new Error('CP7 original recusado.');
      expect(audited.value.comparison).toBe(evidence.comparison);
      expect(audited.value.differences).toEqual(evidence.differences);
      expect(audited.value.cp7.source).toBe(evidence.cp7Source);
      expect(audited.value.cp7.orphanExpressions).toEqual(evidence.orphanExpressions);
      expect(audited.value.resolution).toBe(evidence.resolution);

      const documentBytes = await readFile(`${generated}${destination.programFile}`);
      const document = programDocumentSchema.parse(
        JSON.parse(documentBytes.toString('utf8')) as unknown,
      );
      expect(document).toEqual(audited.value.program);
      expect(Buffer.from(document.source, 'utf8').equals(txt)).toBe(true);
      expect(hash(document.source)).toBe(evidence.destination.sourceSha256);
      expect(hash(documentBytes)).toBe(evidence.destination.programSha256);
      expect(document.characterId).toBe('tartaruga');

      const preview = await readFile(`${generated}${destination.previewFile}`);
      expect(hash(preview)).toBe(evidence.destination.previewSha256);
      expect(preview.length).toBe(evidence.destination.previewBytes);
      const originalPixels = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      const derivedPixels = await sharp(preview).raw().toBuffer({ resolveWithObject: true });
      expect(derivedPixels.info).toEqual(originalPixels.info);
      expect(derivedPixels.data.equals(originalPixels.data)).toBe(true);
      expect((await sharp(preview).metadata()).exif).toBeUndefined();
    }

    expect(
      report.examples.filter((example) => example.comparison === 'equivalent-ast'),
    ).toHaveLength(33);
    const differences = report.examples.filter((example) => example.comparison === 'different-ast');
    expect(differences).toHaveLength(1);
    expect(differences[0]).toMatchObject({
      originalId: 'NomeDoAluno-13-09-2015-1442151872',
      orphanExpressions: ['sum 2 2'],
      differences: [{ path: 'body[4]', txt: null, cp7: { kind: 'call', name: 'sum' } }],
    });
  });
});
