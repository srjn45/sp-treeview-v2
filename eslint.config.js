// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['src/', '**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  ...tseslint.configs.recommended,
);
