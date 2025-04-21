const globals = require('globals');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      parser: tsParser,
      globals: globals.browser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'indent': ['error', 2], // Enforce 2-space indentation
      '@typescript-eslint/type-annotation-spacing': ['error'], // Enforce consistent spacing around type annotations
      'no-unused-vars': ['error'], // Disallow unused variables
    },
  },
];
