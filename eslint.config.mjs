import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'lib/generated/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
      'next-env.d.ts',
      /* OpenNext's Cloudflare bundle — generated output, not source. */
      '.open-next/**',
      '.wrangler/**',
      'cloudflare-env.d.ts',
      /* Agent tooling, not site code. These are vendored helper scripts for
         the local Claude/ruflo setup — they ship with their own style and
         their own lint errors, and letting them fail `npm run lint` makes the
         one gate that guards the app useless for the thing it guards. */
      '.claude/**',
      '.agents/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // The canvas is imperative by design. `react-hooks/immutability` forbids
    // mutating anything a hook returned, which is exactly what driving a WebGL
    // render loop is: uniforms are written every frame, and routing them
    // through React state would re-render the tree sixty times a second to
    // change a few floats.
    //
    // The guard against this going wrong is not the linter — it is the e2e
    // test "the field is wired to scroll, not decoration", which fails if the
    // uniform writes ever stop reaching the GPU.
    files: ['components/field/**/*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
];

export default config;
