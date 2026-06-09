import { build } from 'esbuild';
import { resolve } from 'path';

await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  packages: 'external',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  alias: {
    '@shared/schema': resolve('./shared/schema.ts'),
    '@shared': resolve('./shared'),
  },
});
