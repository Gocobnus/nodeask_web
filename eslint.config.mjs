// eslint.config.mjs

import { FlatCompat } from '@eslint/eslintrc';

// import.meta.dirname is available after Node.js v20.11.0
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      // Add your custom rule here
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // You can also add other rules you want to disable
      // 'react/no-unescaped-entities': 'off',
    },
  }),
];

export default eslintConfig;