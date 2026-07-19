---
title: React
description: Use the sp-treeview custom elements directly in React — typed, no wrapper package.
---

`<sp-tree>` and `<sp-tree-select>` are custom elements, so React uses them
directly — **no wrapper package**. The pattern:

1. Import `@sp-treeview/element` once for its registration side effect.
2. Set object/function inputs (`data`, `loadChildren`) through a `ref` — they
   are DOM properties, not attributes.
3. Listen for `sp-change` with `addEventListener` in an effect.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTreeSelect } from '@sp-treeview/element';
import '@sp-treeview/element';

// JSX typings for the custom elements (no wrapper package needed).
type CustomElementProps<E> = React.HTMLAttributes<E> & {
  ref?: React.Ref<E>; key?: React.Key; class?: string;
};
type SpTreeSelectProps = CustomElementProps<SpTreeSelect> & {
  variant?: 'dropdown' | 'overlay';
  selection?: 'none' | 'single' | 'multi';
  searchable?: boolean;
  placeholder?: string;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements { 'sp-tree-select': SpTreeSelectProps }
  }
}

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true },
];

const loadChildren = async (node: TreeNodeData): Promise<TreeNodeData[]> =>
  node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];

export function RegionPicker() {
  const ref = useRef<SpTreeSelect>(null);
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.data = data;                 // object/function inputs → properties
    el.loadChildren = loadChildren;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ checked: TreeNodeData[] }>).detail;
      setLabels(detail.checked.map((n) => n.label));
    };
    el.addEventListener('sp-change', onChange);
    return () => el.removeEventListener('sp-change', onChange);
  }, []);

  return (
    <div>
      <sp-tree-select
        ref={ref}
        variant="dropdown"
        selection="multi"
        searchable
        placeholder="Pick regions…"
      />
      <p>Selected: {labels.length ? labels.join(', ') : '(none)'}</p>
    </div>
  );
}
```

## Notes

- **React 19** passes unknown props on custom elements as properties when they
  are not primitives, but the `ref` + effect pattern above works on every
  React version and keeps the data flow explicit.
- Keep `data` **stable** (module scope, `useMemo`, or state) — assigning a new
  array replaces the tree and resets its view state.
- The same pattern works for the inline `<sp-tree>`; only the tag and typing
  change.

A runnable version of this component is in the repo at
[`examples/react.tsx`](https://github.com/srjn45/sp-treeview-v2/blob/master/examples/react.tsx).
