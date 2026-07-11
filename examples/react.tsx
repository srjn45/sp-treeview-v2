/**
 * React 19 usage example — COMPILE-CHECKED (tsc --noEmit) but not shipped.
 *
 * `<sp-tree>` / `<sp-tree-select>` are framework-agnostic custom elements, so
 * React uses them directly with no wrapper library. Object/function inputs
 * (`data`, `loadChildren`) are set as DOM *properties* via a ref (React 19 also
 * forwards unknown props to the element, but going through the ref keeps the
 * types honest); the `sp-change` CustomEvent is wired with addEventListener.
 */
import { useEffect, useRef, useState } from 'react';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTree, SpTreeSelect } from '@sp-treeview/element';
// Registers the custom elements as a side effect.
import '@sp-treeview/element';

// --- JSX typings for the custom elements (no wrapper package needed) --------
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

// --- Data -------------------------------------------------------------------
const DATA: TreeNodeData[] = [
  {
    id: 'india',
    label: 'India',
    children: [
      { id: 'mh', label: 'Maharashtra', children: [
        { id: 'mum', label: 'Mumbai' },
        { id: 'pune', label: 'Pune' },
      ] },
      { id: 'ka', label: 'Karnataka', children: [
        { id: 'blr', label: 'Bengaluru' },
      ] },
    ],
  },
  { id: 'canada', label: 'Canada (lazy)', hasChildren: true },
];

const loadChildren = (node: TreeNodeData): Promise<TreeNodeData[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(node.id === 'canada' ? [{ id: 'on', label: 'Ontario' }] : []);
    }, 300);
  });

// --- Multi-select change payload (matches the element's sp-change detail) ---
interface MultiChangeDetail {
  checked: TreeNodeData[];
  allSelected: boolean;
}

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

// Inline variant, showing property wiring on <sp-tree> too.
export function RegionTree(): React.ReactElement {
  const ref = useRef<SpTree>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.data = DATA;
    el.loadChildren = loadChildren;
  }, []);

  return <sp-tree ref={ref} selection="multi" cascade searchable />;
}
