---
title: Vue 3
description: Use the sp-treeview custom elements in Vue 3 with a template ref.
---

Tell Vue that `sp-*` tags are custom elements so it doesn't try to resolve
them as components. In a Vite project:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('sp-'),
        },
      },
    }),
  ],
};
```

Then bind object/function inputs imperatively via a template ref:

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTreeSelect } from '@sp-treeview/element';
import '@sp-treeview/element';

interface MultiChangeDetail { checked: TreeNodeData[]; allSelected: boolean }

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true },
];

const loadChildren = async (node: TreeNodeData): Promise<TreeNodeData[]> =>
  node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];

const picker = ref<SpTreeSelect | null>(null);
const labels = ref<string[]>([]);

function onChange(e: Event) {
  const detail = (e as CustomEvent<MultiChangeDetail>).detail;
  labels.value = detail.checked.map((n) => n.label);
}

onMounted(() => {
  const el = picker.value;
  if (!el) return;
  el.data = data;                 // object/function inputs → properties
  el.loadChildren = loadChildren;
  el.addEventListener('sp-change', onChange);
});

onBeforeUnmount(() => {
  picker.value?.removeEventListener('sp-change', onChange);
});
</script>

<template>
  <sp-tree-select
    ref="picker"
    variant="dropdown"
    selection="multi"
    searchable
    placeholder="Pick regions…"
  />
  <p>Selected: {{ labels.length ? labels.join(', ') : '(none)' }}</p>
</template>
```

## Notes

- Vue can also bind properties in the template with the `.prop` modifier
  (`:data.prop="data"`), but the imperative ref pattern above makes the
  property-vs-attribute distinction explicit and mirrors the React guide.
- Primitive inputs (`selection`, `searchable`, `variant`, `placeholder`) are
  plain attributes and can stay in the template.
- Events from the element are native DOM `CustomEvent`s — `@sp-change` in the
  template also works once `isCustomElement` is configured.
