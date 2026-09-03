const { defineConfig, globalIgnores } = require('eslint/config');
const angular = require('angular-eslint');
const sheriff = require('@softarc/eslint-plugin-sheriff');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const tseslint = require('typescript-eslint');

module.exports = defineConfig(
  globalIgnores([
    '.angular/**',
    'dist/**',
    'node_modules/**',
    'src-tauri/**',
    'out-tsc/**',
  ]),
  sheriff.configs.all,
  {
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: null,
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@angular-eslint/component-class-suffix': [
        'error',
        { suffixes: ['Page', 'Component'] },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'cb', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'cb', style: 'camelCase' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['interface', 'typeAlias'],
          format: ['PascalCase'],
          custom: { regex: '^(I|T)[A-Z][a-z]', match: false },
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', '**/internal/**', '**/src/**', '**/esm/**'],
              message:
                "Import from the package root or a published subpath — a path into a package's build output is not an entry point and can move in a patch release.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/*/util/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Decorator[expression.callee.name="Injectable"]',
          message:
            'util/ holds no injectable service — a service that holds state or reaches a platform API belongs in data/.',
        },
      ],
    },
  },
  {
    files: ['src/app/game/util/board.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/economy',
                '**/crew-rules',
                '**/supply',
                '**/consultancy.model',
              ],
              message:
                'The board is stepped, never priced. It is handed its answers — CrewRules, a seat, a spawner — never the consultancy that computes them.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
  {
    files: ['**/*.ts', '**/*.html'],
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  prettierConfig
);
