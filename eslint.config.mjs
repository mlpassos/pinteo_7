import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';

/** Declara imports proibidos conforme as fronteiras de cada camada. */
function restrict(groups, pureCore = false) {
  return [
    'error',
    {
      patterns: [
        ...groups.map((group) => ({
          group: group.flatMap((pattern) =>
            pattern.endsWith('/**') ? [pattern, pattern.slice(0, -3)] : [pattern],
          ),
          message: 'Respeite as fronteiras de docs/ARQUITETURA.md.',
        })),
        ...(pureCore
          ? [{ regex: '^(?!\\.{1,2}/)', message: 'Core depende apenas de módulos puros locais.' }]
          : []),
      ],
    },
  ];
}

export default tseslint.config(
  {
    ignores: [
      'js/**',
      'design/**',
      'dist/**',
      'docs/reference/**',
      'node_modules/**',
      'compartilhados/**',
      'tests/fixtures/legacy/originals/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        structuredClone: 'readonly',
        TextEncoder: 'readonly',
      },
    },
  },
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, jsdoc },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
          contexts: ['TSMethodSignature'],
        },
      ],
      'jsdoc/check-tag-names': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'TSAnyKeyword', message: 'Dados externos são unknown; any é proibido.' },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    languageOptions: {
      globals: { window: 'off', document: 'off', HTMLElement: 'off', localStorage: 'off' },
    },
    rules: {
      'no-restricted-imports': restrict(
        [
          [
            'react',
            'react-dom',
            'react-dom/*',
            'node:*',
            '**/application/**',
            '**/shared/**',
            '**/ui/**',
            '**/infrastructure/**',
            '**/server/**',
          ],
        ],
        true,
      ),
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'HTMLElement',
        'localStorage',
        'fetch',
      ],
    },
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict([
        [
          'react',
          'node:*',
          '**/application/**',
          '**/ui/**',
          '**/infrastructure/**',
          '**/server/**',
        ],
      ]),
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict([
        ['react', 'react-dom', 'node:*', '**/ui/**', '**/infrastructure/**', '**/server/**'],
      ]),
    },
  },
  {
    files: ['src/infrastructure/**/*.ts'],
    rules: { 'no-restricted-imports': restrict([['**/ui/**', '**/server/**']]) },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict([
        ['react', '**/ui/**', '**/infrastructure/**', '**/application/**'],
      ]),
    },
  },
  prettier,
);
