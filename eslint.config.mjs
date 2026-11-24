import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Flat ESLint config (ESLint 9). The rule set is documented in README.md
 * under "Linting".
 */
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'scripts/**'],
  },
  js.configs.recommended,
  // Provides the TS parser/plugin for .ts/.tsx, turns off core rules that the
  // TypeScript compiler already enforces (including `no-undef`), and enables
  // the recommended @typescript-eslint rules.
  ...tseslint.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // TypeScript resolves identifiers itself; `no-undef` reports false
      // positives for types and globals in .ts/.tsx files.
      'no-undef': 'off',

      // Use the TS-aware version of no-unused-vars. Prefix a name with `_`
      // to mark it as intentionally unused.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // Empty catch blocks are a common, intentional "best effort" pattern;
      // other empty blocks are still reported.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
