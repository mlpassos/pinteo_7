import { describe, expect, it } from 'vitest';

import { fail, succeed } from '../../src/core/common/index.js';
import { createBlockId } from '../../src/core/program/index.js';

describe('identidade central dos blocos', () => {
  it.each(['a', 'block-1', 'bloco_27', '31d7821a-986f-46a7-9bed-cf7cc702a7dd', 'a'.repeat(128)])(
    'aceita %s sem normalizar a identidade',
    (value) => {
      expect(createBlockId(value)).toEqual({ ok: true, value });
    },
  );

  it.each([
    '',
    'a'.repeat(129),
    ' bloco',
    'bloco ',
    'bloco\n',
    'a\nb',
    '-bloco',
    '_bloco',
    'bloco/1',
    'peça',
    '<script>',
    null,
    undefined,
    42,
    { id: 'bloco' },
  ])('rejeita identidade externa inválida %j com diagnóstico', (value) => {
    const result = createBlockId(value);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.code).toBe('INVALID_BLOCK_ID');
      expect(result.diagnostics[0]?.message).toBe(
        'O identificador do bloco deve ter de 1 a 128 letras, números, hífens ou sublinhados e começar com letra ou número.',
      );
      expect(result).not.toHaveProperty('value');
    }
  });
});

describe('resultados explícitos', () => {
  it('conserva fonte e identidade do valor bem-sucedido', () => {
    const document = { source: '; desenho\nrepeat 4 [fw 20 rt 90]\n' };
    const result = succeed(document);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(document);
      expect(result.value.source).toBe('; desenho\nrepeat 4 [fw 20 rt 90]\n');
    }
  });

  it('transporta diagnósticos em ordem, incluindo spans UTF-16, sem valor parcial', () => {
    const first = {
      code: 'UNSUPPORTED',
      message: 'Comando não representável.',
      span: { start: 2, end: 8 },
    };
    const second = { code: 'INCOMPLETE', message: 'Expressão incompleta.' };
    const result = fail(first, second);

    expect(result).toEqual({ ok: false, diagnostics: [first, second] });
    expect(result).not.toHaveProperty('value');
  });
});
