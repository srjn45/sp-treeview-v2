/**
 * Compile-checked source for the React section of `packages/element/README.md`.
 * Type-checked against the BUILT packages as part of the `examples` workspace
 * gate. `<sp-tree>` / `<sp-tree-select>` are framework-agnostic custom elements,
 * so React uses them directly — no wrapper package.
 */
import { useEffect, useRef, useState } from 'react';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTree, SpTreeSelect } from '@sp-treeview/element';
// Registers <sp-tree> / <sp-tree-select> as a side effect.
import '@sp-treeview/element';

// --- JSX typings for the custom elements (no wrapper package needed) ---------
type CustomElementProps<E> = React.HTMLAttributes<E> & {
  ref?: React.Ref<E>;
  key?: React.Key;
  class?: string;
};
type SpTreeProps = CustomElementProps<SpTree> & {
  selection?: 'none' | 'single' | 'multi';
  cascade?: boolean;
  searchable?: boolean;
  'show-all-node'?: boolean;
};
type SpTreeSelectProps = CustomElementProps<SpTreeSelect> & {
  variant?: 'dropdown' | 'overlay';
  selection?: 'none' | 'single' | 'multi';
  searchable?: boolean;
  placeholder?: string;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'sp-tree': SpTreeProps;
      'sp-tree-select': SpTreeSelectProps;
    }
  }
}

const DATA: TreeNodeData[] = [
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

export function RegionPicker(): React.ReactElement {
  const ref = useRef<SpTreeSelect>(null);
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Object/function inputs go through properties, not attributes.
    el.data = DATA;
    el.loadChildren = loadChildren;
    const onChange = (e: Event): void => {
      const detail = (e as CustomEvent<MultiChangeDetail>).detail;
      setLabels(detail.checked.map((n) => n.label));
    };
    el.addEventListener('sp-change', onChange);
    return () => el.removeEventListener('sp-change', onChange);
  }, []);

  return (
    <div>
      <sp-tree-select ref={ref} variant="dropdown" selection="multi" searchable placeholder="Pick regions…" />
      <p>Selected: {labels.length ? labels.join(', ') : '(none)'}</p>
    </div>
  );
}
