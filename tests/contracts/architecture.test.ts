import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

describe('fronteiras do core verificadas pelo lint real', () => {
  it.each([
    '../../application',
    '../../application/index.js',
    '../../shared',
    '../../shared/index.js',
    'react',
    'node:fs',
    'fs',
    'zod',
  ])('rejeita import de %s', async (specifier) => {
    const results = await eslint.lintText(`import '${specifier}';`, {
      filePath: 'src/core/program/index.ts',
    });
    expect(
      results
        .flatMap((result) => result.messages)
        .some((message) => message.ruleId === 'no-restricted-imports'),
    ).toBe(true);
  });
  it('permite a API pública de outro módulo puro', async () => {
    const results = await eslint.lintText("import '../common/index.js';", {
      filePath: 'src/core/program/index.ts',
    });
    expect(
      results
        .flatMap((result) => result.messages)
        .filter((message) => message.ruleId === 'no-restricted-imports'),
    ).toEqual([]);
  });
});
