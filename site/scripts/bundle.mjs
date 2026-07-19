// Bundle the workspace packages (@sp-treeview/element + /core, with Lit and
// @floating-ui/dom inlined) into a single self-contained ESM file the landing
// page imports for its live demos. Requires the workspace to be built first:
//   npm ci && npm run build --workspace=@sp-treeview/element   (repo root)
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const root = resolve(site, '..');

const elementDist = resolve(root, 'packages/element/dist/index.js');
if (!existsSync(elementDist)) {
  console.error(
    'site/scripts/bundle.mjs: packages/element/dist not found.\n' +
    'Build the workspace first (from the repo root):\n' +
    '  npm ci && npm run build --workspace=@sp-treeview/element',
  );
  process.exit(1);
}

await build({
  entryPoints: [resolve(site, 'src/demo/vendor.entry.js')],
  outfile: resolve(site, 'src/demo/sp-treeview.bundle.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  sourcemap: false,
  legalComments: 'none',
});

console.log('site: wrote src/demo/sp-treeview.bundle.js');
