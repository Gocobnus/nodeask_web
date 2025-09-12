// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginTypeScript from '@typescript-eslint/eslint-plugin'; // 导入插件
import eslintParserTypeScript from '@typescript-eslint/parser'; // 导入解析器

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  // ...compat.config 是为了兼容旧版配置，这里也可以保留
  ...compat.config({
    extends: ['next/core-web-vitals'],
  }),
  {
    // 配置 TypeScript 相关规则
    files: ['**/*.ts', '**/*.tsx'], // 指定只对 .ts 和 .tsx 文件生效
    plugins: {
      '@typescript-eslint': eslintPluginTypeScript, // 在 plugins 中注册插件
    },
    languageOptions: {
      parser: eslintParserTypeScript, // 指定 TypeScript 解析器
      parserOptions: {
        project: './tsconfig.json', // 告诉解析器您的 tsconfig 文件在哪里
      },
    },
    rules: {
      // 您的自定义规则
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // 您可以添加其他任何您需要的 @typescript-eslint 规则
      // '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
];

export default eslintConfig;