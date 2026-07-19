// sp-treeview-v2 v3 is a compatibility alias for the sp-treeview v4 rewrite.
// Importing it registers <sp-tree> and <sp-tree-select> as a side effect.
// New projects should depend on @sp-treeview/element / @sp-treeview/core directly.
export const VERSION = '3.0.0';
export { SpTree, SpTreeSelect } from '@sp-treeview/element';
export { TreeStore } from '@sp-treeview/core';
