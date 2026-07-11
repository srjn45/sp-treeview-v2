// Bundle vendor.entry.ts (Lit + floating-ui + @sp-treeview/core + /element) into
// a single self-contained ESM file the plain-HTML demo can load from a static
// server. Resolves the workspace packages via their built dist (see `libs`).
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

await build({
  entryPoints: [resolve(root, 'vendor.entry.ts')],
  outfile: resolve(root, 'vendor.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  sourcemap: false,
  legalComments: 'none',
});

// eslint-disable-next-line no-console
console.log('examples: wrote vendor.js');
