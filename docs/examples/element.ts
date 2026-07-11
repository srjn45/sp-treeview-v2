/**
 * Compile-checked source for the plain-JS/TS samples in
 * `packages/element/README.md`, `docs/theming.md` and the element parts of the
 * migration guide. Type-checked against the BUILT `@sp-treeview/element` and
 * `@sp-treeview/core` packages as part of the `examples` workspace gate.
 */
import { SpTree, SpTreeSelect } from '@sp-treeview/element';
import type { TreeNodeData } from '@sp-treeview/core';

// [el-1] Data + lazy loader (shared by the snippets below) --------------------
const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [
      { id: 'mumbai', label: 'Mumbai' },
      { id: 'pune', label: 'Pune' },
    ] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy branch
];

const loadChildren = (node: TreeNodeData): Promise<TreeNodeData[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : []);
    }, 300);
  });

// [el-2] sp-change detail shapes (multi vs single) ----------------------------
interface MultiChangeDetail {
  checked: TreeNodeData[];
  allSelected: boolean;
}
interface SingleChangeDetail {
  selected: TreeNodeData | null;
}
interface LoadErrorDetail {
  node: TreeNodeData;
  error: Error;
}

// [el-3] Inline <sp-tree> via imperative property wiring ----------------------
export function mountTree(host: HTMLElement): SpTree {
  const tree = document.createElement('sp-tree') as SpTree;
  // Object/function inputs are DOM *properties*, never attributes.
  tree.data = data;
  tree.loadChildren = loadChildren;
  // Primitive inputs may be attributes or properties.
  tree.selection = 'multi';
  tree.cascade = true;
  tree.searchable = true;

  tree.addEventListener('sp-change', (e) => {
    const detail = (e as CustomEvent<MultiChangeDetail>).detail;
    console.log('checked:', detail.checked.map((n) => n.label), 'all:', detail.allSelected);
  });
  tree.addEventListener('sp-expand', (e) => {
    console.log('expanded', (e as CustomEvent<{ node: TreeNodeData }>).detail.node.id);
  });
  tree.addEventListener('sp-load-error', (e) => {
    const { node, error } = (e as CustomEvent<LoadErrorDetail>).detail;
    console.warn('load failed for', node.id, error.message);
  });

  host.append(tree);
  return tree;
}

// [el-4] Single-select tree ---------------------------------------------------
export function mountSingle(host: HTMLElement): SpTree {
  const tree = document.createElement('sp-tree') as SpTree;
  tree.data = data;
  tree.selection = 'single';
  tree.addEventListener('sp-change', (e) => {
    const { selected } = (e as CustomEvent<SingleChangeDetail>).detail;
    console.log('selected:', selected?.label ?? '(none)');
  });
  host.append(tree);
  return tree;
}

// [el-5] Dropdown / overlay field <sp-tree-select> ----------------------------
export function mountSelect(host: HTMLElement): SpTreeSelect {
  const select = document.createElement('sp-tree-select') as SpTreeSelect;
  select.data = data;
  select.loadChildren = loadChildren;
  select.variant = 'dropdown';        // or 'overlay'
  select.selection = 'multi';
  select.searchable = true;
  select.placeholder = 'Pick regions…';

  select.addEventListener('sp-change', (e) => {
    const detail = (e as CustomEvent<MultiChangeDetail>).detail;
    console.log('selected leaves:', detail.checked.map((n) => n.label));
  });

  host.append(select);
  // Imperative open/close control is available too:
  select.open();
  select.close();
  select.toggle();
  return select;
}

// [el-6] Custom row content via renderNode -----------------------------------
// (uses Lit's html; the render prop returns a Lit TemplateResult)
export function mountCustomRow(host: HTMLElement): void {
  const tree = document.createElement('sp-tree') as SpTree;
  tree.data = data;
  tree.renderNode = (node, ctx) => {
    // ctx.row is the Row, ctx.store is the TreeStore
    void ctx;
    // Return any Lit TemplateResult; here we defer to a simple text node label.
    return htmlLabel(node.label);
  };
  host.append(tree);
}

// Local helper standing in for a Lit `html` template in the doc snippet.
import { html, type TemplateResult } from 'lit';
function htmlLabel(label: string): TemplateResult {
  return html`<span>${label}</span>`;
}

// [el-7] Form participation ---------------------------------------------------
// <sp-tree-select> is form-associated: its value is a JSON array of checked ids.
export function readFormValue(form: HTMLFormElement): string | null {
  const fd = new FormData(form);
  const raw = fd.get('regions');
  return typeof raw === 'string' ? raw : null; // e.g. '["mumbai","pune"]'
}
