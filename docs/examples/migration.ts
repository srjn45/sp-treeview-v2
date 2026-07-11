/**
 * Compile-checked v4 ("after") code blocks used in
 * `docs/migration-v3-to-v4.md`. Type-checked against the BUILT packages as part
 * of the `examples` workspace gate, so the migration targets can't drift.
 */
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';

// [mig-1] Data: legacy Node/NodeLike → v4 TreeNodeData -------------------------
// Legacy: { name, value, children: [] /* lazy */ | null /* leaf */ }
// v4:     { id (unique!), label, hasChildren?: true /* lazy */, children? }
const data: TreeNodeData[] = [
  {
    id: 'india',                 // was `value` — now a REQUIRED, unique id
    label: 'India',              // was `name`
    children: [                  // loaded branch (unchanged shape)
      { id: 'mumbai', label: 'Mumbai' },      // leaf: no children key (was children: null)
    ],
  },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy: was children: []
];

// [mig-2] Selection: SELECT_* + change([ALL]) → selection + allSelected --------
const store = new TreeStore({
  data,
  selection: 'multi',            // SELECT_CHECKBOX → 'multi', SELECT_RADIO → 'single', SELECT_NONE → 'none'
  cascade: true,
  // TreeLevelConfig.loadOnce → loadOnce; allNode → element `showAllNode`
  loadOnce: true,
  // loadChildren Output event + node.loadChildren(children) → a Promise-returning option
  loadChildren: async (node) => (node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : []),
});

// getSelectedValues() → getChecked()/getCheckedLeaves()/getSelected()
const checked: TreeNodeData[] = store.getChecked();
// The legacy sentinel `new Node('All', 'ALL')` in the change payload is gone:
const allSelected: boolean = store.isAllChecked();
void checked; void allSelected;

// [mig-3] Runtime mutation: Node.addChild/removeMe → store commands ------------
store.addNode('india', { id: 'pune', label: 'Pune' }); // was parent.addChild(node)
store.removeNode('pune');                               // was node.removeMe()
store.updateNode('india', { label: 'Republic of India' });
