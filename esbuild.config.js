import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  packages: 'external',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  tsconfig: './tsconfig.json',
  alias: {
    '@shared/schema': resolve(__dirname, 'shared/schema.ts'),
    '@shared': resolve(__dirname, 'shared'),
  },
});
