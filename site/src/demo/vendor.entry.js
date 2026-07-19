// Entry for the demo bundle (see scripts/bundle.mjs). Importing the element
// dist registers <sp-tree> and <sp-tree-select> as a side effect; TreeStore is
// re-exported so demos can pre-seed expansion/selection state.
export { SpTree, SpTreeSelect } from '../../../packages/element/dist/index.js';
export { TreeStore } from '../../../packages/core/dist/index.js';
