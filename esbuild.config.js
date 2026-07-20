import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  tsconfig: './tsconfig.json',
  // Mark node_modules external via regex, but make sure @shared is NOT matched
  external: [
    // Mark standard npm packages as external, excluding anything starting with @shared
    '/^node_modules/(?!@shared)/',
  ],
  // Alternatively, esbuild allows an array of package names or patterns:
  packages: 'external', // Note: keep reading below!
  alias: {
    '@shared': resolve(__dirname, 'shared'),
  },
});
