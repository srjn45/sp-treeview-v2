/**
 * Bundle entry for the plain-HTML demo. esbuild inlines Lit, @floating-ui/dom,
 * @sp-treeview/core and @sp-treeview/element into a single self-contained
 * `vendor.js` so `examples/index.html` can be served by any static file server
 * with no bare-specifier resolution, import map, or CDN.
 *
 * Importing `@sp-treeview/element` registers <sp-tree> and <sp-tree-select> as a
 * side effect; TreeStore and Lit's `html` are re-exported for the inline demo.
 */
export { SpTree, SpTreeSelect } from '@sp-treeview/element';
export { TreeStore } from '@sp-treeview/core';
export type { TreeNodeData } from '@sp-treeview/core';
export { html } from 'lit';
