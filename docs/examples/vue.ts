/**
 * Compile-checked source for the Vue section of `packages/element/README.md`.
 * This is the exact `<script setup lang="ts">` logic shown in the docs, extracted
 * to a `.ts` module so it type-checks against the BUILT packages (a `.vue` SFC
 * template cannot be checked by plain `tsc`; the imperative wiring can and is).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTreeSelect } from '@sp-treeview/element';
// Registers <sp-tree> / <sp-tree-select> as a side effect.
import '@sp-treeview/element';

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true },
];

const loadChildren = (node: TreeNodeData): Promise<TreeNodeData[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : []), 300),
  );

interface MultiChangeDetail { checked: TreeNodeData[]; allSelected: boolean }

// In the SFC this is bound with `<sp-tree-select ref="picker" ...>`.
const picker = ref<SpTreeSelect | null>(null);
const labels = ref<string[]>([]);

function onChange(e: Event): void {
  const detail = (e as CustomEvent<MultiChangeDetail>).detail;
  labels.value = detail.checked.map((n) => n.label);
}

onMounted(() => {
  const el = picker.value;
  if (!el) return;
  // Object/function inputs go through properties, not attributes.
  el.data = data;
  el.loadChildren = loadChildren;
  el.addEventListener('sp-change', onChange);
});

onBeforeUnmount(() => {
  picker.value?.removeEventListener('sp-change', onChange);
});

export { picker, labels };
