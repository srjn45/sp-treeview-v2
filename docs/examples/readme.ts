/**
 * Compile-checked source for the root README quick-start block. Type-checked
 * against the BUILT packages as part of the `examples` workspace gate.
 */
import '@sp-treeview/element';
import type { TreeNodeData } from '@sp-treeview/core';

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy branch
];

const tree = document.querySelector('sp-tree')!;
tree.data = data;                                  // object inputs are properties
tree.loadChildren = async (node) =>
  node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];
tree.addEventListener('sp-change', (e) => {
  const { checked } = (e as CustomEvent<{ checked: TreeNodeData[] }>).detail;
  console.log(checked.map((n) => n.label));
});
