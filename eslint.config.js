import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Layers (each may import the ones before it): util → engine → world → game, ui, opening, title →
 * boot, dev. A rule here keeps an import from pointing the wrong way; type-only imports are free
 * (they're erased), so a contract's shapes can be shared without a runtime dependency.
 */
const LAYERS = [
  'audio',
  'boot',
  'content',
  'course',
  'dev',
  'engine',
  'game',
  'islands',
  'learn',
  'opening',
  'title',
  'ui',
  'util',
  'world',
];

/** Files under `src/<dir>/` may not import (at runtime) from the `forbidden` layers. */
function layer(dir, forbidden, why) {
  return {
    files: [`src/${dir}/**/*.{ts,tsx}`],
    // A test may reach across layers to check two of them together.
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: forbidden.map((l) => `**/${l}/**`),
              allowTypeImports: true,
              message: why,
            },
          ],
        },
      ],
    },
  };
}

const without = (...allowed) => LAYERS.filter((l) => !allowed.includes(l));

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.tools/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'coverage/',
      // The Basis Universal transcoder, copied unchanged from three.js.
      'public/basis/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['tools/**/*.{js,mjs}', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Rules that need types: a promise nobody waits for or catches, an `await` on a plain value, and a
  // `switch` over a union that misses a member (a `default` counts as covering the rest).
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts', 'tools/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  // The React UI: hooks called in order, and effects that list what they read.
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  // The dev pages (devpages/*.html → src/dev/) are not part of the game: nothing imports them.
  layer('!(dev)', ['dev'], 'src/dev is for the dev pages only; the game must not import it.'),
  layer('util', without('util'), 'src/util is the bottom layer: it imports no other part of the game.'),
  layer(
    'engine',
    without('engine', 'util'),
    'src/engine imports only itself and src/util; pass in what it needs from higher layers.',
  ),
  layer(
    'world',
    ['game', 'ui', 'opening', 'title', 'boot', 'dev'],
    "The world's views don't import game or UI code: share shapes through an island's contract (type-only), or move shared data down into the world, content or course layer.",
  ),
);
