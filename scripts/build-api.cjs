const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  outfile: 'api/index.js',
}).then(() => {
  console.log('SUCCESS: api/index.js built');
}).catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
