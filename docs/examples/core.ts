/**
 * Compile-checked source for every TypeScript sample in
 * `packages/core/README.md` and the core-facing parts of the migration guide.
 *
 * This file is type-checked (tsc --noEmit) against the BUILT `@sp-treeview/core`
 * package as part of the `examples` workspace gate. The README snippets are
 * copied verbatim from the numbered blocks below — if the API changes, this
 * file stops compiling and the docs must be updated to match.
 */
import {
  TreeStore,
  VERSION,
  type TreeNodeData,
  type Row,
  type TreeChangeEvent,
} from '@sp-treeview/core';

// [core-1] Data model ---------------------------------------------------------
const data: TreeNodeData[] = [
  {
    id: 'india',
    label: 'India',
    children: [
      { id: 'mh', label: 'Maharashtra', children: [
        { id: 'mumbai', label: 'Mumbai' },
        { id: 'pune', label: 'Pune' },
      ] },
    ],
  },
  // hasChildren:true + no `children` key → lazy, not-yet-loaded branch.
  { id: 'usa', label: 'USA', hasChildren: true },
  // children:[] → a loaded branch that happens to be empty (expandable-empty).
  { id: 'empty', label: 'Empty group', children: [] },
];

// [core-2] Create a store -----------------------------------------------------
const store = new TreeStore({
  data,
  selection: 'multi',   // 'none' | 'single' | 'multi'  (default 'none')
  cascade: true,        // parent<->child propagation (multi only, default true)
  loadChildren: async (node) => {
    // Called lazily the first time a `hasChildren` node is expanded.
    return node.id === 'usa'
      ? [{ id: 'ca', label: 'California' }, { id: 'ny', label: 'New York' }]
      : [];
  },
  loadOnce: true,       // cache loaded children (default true)
  initialExpanded: ['india'],
  initialChecked: ['mumbai'],
});

// [core-3] Render from rows() -------------------------------------------------
for (const row of store.rows()) {
  const indent = '  '.repeat(row.level - 1);
  const box = row.checked === 'checked' ? '[x]'
    : row.checked === 'indeterminate' ? '[-]'
    : '[ ]';
  // aria-level=row.level, aria-setsize=row.setSize, aria-posinset=row.posInSet
  console.log(`${indent}${box} ${row.node.label}`);
  if (row.loading) console.log(`${indent}    (loading…)`);
  if (row.loadError) console.log(`${indent}    error: ${row.loadError.message}`);
}

// [core-4] Reads --------------------------------------------------------------
const topChecked: TreeNodeData[] = store.getChecked();       // topmost fully-checked
const checkedLeaves: TreeNodeData[] = store.getCheckedLeaves();
const selectedNode: TreeNodeData | null = store.getSelected(); // single mode only
const oneNode: TreeNodeData | undefined = store.getNode('india');
const allChecked: boolean = store.isAllChecked();
void topChecked; void checkedLeaves; void selectedNode; void oneNode; void allChecked;

// [core-5] Commands -----------------------------------------------------------
store.expand('usa');           // lazy → triggers loadChildren, spinner via rows()
store.collapse('india');
store.toggleExpanded('india');
store.setChecked('pune', true);
store.toggleChecked('pune');
store.setAllChecked(true);
store.retryLoad('usa');        // re-attempt after a load error

// Mutations
store.addNode('india', { id: 'ka', label: 'Karnataka' });
store.updateNode('ka', { label: 'Karnataka (South)' });
store.removeNode('ka');
store.setData(data);           // replace the whole tree (resets all view state)

// [core-6] Filtering ----------------------------------------------------------
store.setFilter('mumbai');     // reveals matches + ancestors; rows() drops the rest
store.clearFilter();           // restores the pre-filter expansion state

// [core-7] Single selection ---------------------------------------------------
const single = new TreeStore({ data, selection: 'single' });
single.select('india');                 // exactly one selected/checked node
const chosen = single.getSelected();    // TreeNodeData | null
void chosen;

// [core-8] Subscribe ----------------------------------------------------------
const unsubscribe = store.subscribe((e: TreeChangeEvent) => {
  switch (e.type) {
    case 'rows': /* anything affecting rows() */ break;
    case 'checked': console.log('checked changed:', e.ids); break;
    case 'selected': console.log('selected id:', e.id); break;
    case 'load': console.log(`load ${e.id}: ${e.status}`); break;
  }
});
unsubscribe();

// [core-9] Duplicate ids throw ------------------------------------------------
try {
  // Every id must be unique across the whole tree.
  new TreeStore({ data: [{ id: 'dup', label: 'A' }, { id: 'dup', label: 'B' }] });
} catch (err) {
  console.error((err as Error).message); // Duplicate node id: "dup"
}

// [core-10] Custom matcher ----------------------------------------------------
const byPrefix = new TreeStore({
  data,
  matcher: (query: string, node: TreeNodeData) =>
    node.label.toLowerCase().startsWith(query.toLowerCase()),
});
byPrefix.setFilter('mum');

// [core-11] Typed Row helper --------------------------------------------------
function describeRow<T>(row: Row<T>): string {
  return `${row.node.label} @ level ${row.level} (${row.checked})`;
}
void describeRow(store.rows()[0] ?? { } as Row);

console.log('core version', VERSION);
