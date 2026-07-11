import { describe, it, expect, beforeEach } from 'vitest';
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';
import './sp-tree-select.js';
import './sp-tree.js';

async function tick(): Promise<void> {
  // A few microtask/macrotask turns for Lit's async render + nested <sp-tree>.
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(r => setTimeout(r, 0));
  await Promise.resolve();
}

const sampleData: TreeNodeData[] = [
  {
    id: 'a',
    label: 'Alpha',
    children: [
      { id: 'a1', label: 'Alpha One' },
      { id: 'a2', label: 'Alpha Two' },
    ],
  },
  {
    id: 'b',
    label: 'Bravo',
    children: [{ id: 'b1', label: 'Bravo One' }],
  },
  { id: 'c', label: 'Charlie' },
];

type SpTreeSelectEl = HTMLElement & {
  data: TreeNodeData[];
  store?: TreeStore;
  selection?: string;
  variant?: string;
  open(): void;
  close(): void;
};

describe('<sp-tree-select>', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => container.remove();
  });

  function makeSelect(opts: {
    store?: TreeStore;
    selection?: string;
    variant?: string;
    data?: TreeNodeData[];
  } = {}): SpTreeSelectEl {
    const el = document.createElement('sp-tree-select') as SpTreeSelectEl;
    if (opts.store) el.store = opts.store;
    el.selection = opts.selection ?? 'multi';
    if (opts.variant) el.variant = opts.variant;
    el.data = opts.data ?? sampleData;
    container.appendChild(el);
    return el;
  }

  // ---- chips add / remove ----

  it('shows a placeholder when nothing is selected', async () => {
    const el = makeSelect();
    await tick();
    const placeholder = el.shadowRoot!.querySelector('[part~="placeholder"]');
    expect(placeholder).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[part~="chip"]')).toBeNull();
  });

  it('renders a chip per checked leaf', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi' });
    const el = makeSelect({ store });
    await tick();
    expect(el.shadowRoot!.querySelector('[part~="chip"]')).toBeNull();

    store.setChecked('a1', true);
    store.setChecked('c', true);
    await tick();

    const chips = el.shadowRoot!.querySelectorAll('[part~="chip"]');
    const ids = Array.from(chips).map(c => (c as HTMLElement).dataset['id']).filter(Boolean);
    expect(ids.sort()).toEqual(['a1', 'c']);
  });

  it('checking a parent renders a chip per cascaded leaf', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi' });
    const el = makeSelect({ store });
    await tick();

    store.setChecked('a', true); // cascades to a1, a2
    await tick();

    const ids = Array.from(el.shadowRoot!.querySelectorAll('[part~="chip"]'))
      .map(c => (c as HTMLElement).dataset['id'])
      .filter(Boolean)
      .sort();
    expect(ids).toEqual(['a1', 'a2']);
  });

  it('clicking a chip remove (×) unchecks the leaf and drops the chip', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi', initialChecked: ['a1', 'c'] });
    const el = makeSelect({ store });
    await tick();
    expect(el.shadowRoot!.querySelectorAll('[part~="chip"]').length).toBe(2);

    const removeA1 = el.shadowRoot!.querySelector(
      '[data-id="a1"] [part="chip-remove"]',
    ) as HTMLElement;
    expect(removeA1).not.toBeNull();
    removeA1.click();
    await tick();

    expect(store.getCheckedLeaves().map(n => n.id)).toEqual(['c']);
    const remaining = Array.from(el.shadowRoot!.querySelectorAll('[part~="chip"]'))
      .map(c => (c as HTMLElement).dataset['id']);
    expect(remaining).toEqual(['c']);
  });

  it('removing a chip keeps ancestor cascade correct (parent becomes indeterminate)', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi', initialChecked: ['a'] });
    const el = makeSelect({ store });
    await tick();

    const removeA1 = el.shadowRoot!.querySelector(
      '[data-id="a1"] [part="chip-remove"]',
    ) as HTMLElement;
    removeA1.click();
    await tick();

    const rowA = store.rows().find(r => r.node.id === 'a')!;
    expect(rowA.checked).toBe('indeterminate');
  });

  // ---- open / close + focus management ----

  it('opens the panel on trigger activation and moves focus into it', async () => {
    const el = makeSelect({ variant: 'overlay' });
    await tick();
    expect(el.shadowRoot!.querySelector('[part~="panel"]')).toBeNull();

    const field = el.shadowRoot!.querySelector('[part~="field"]') as HTMLElement;
    field.click();
    await tick();

    const panel = el.shadowRoot!.querySelector('[part~="panel"]');
    expect(panel).not.toBeNull();
    // Focus moved off the trigger and into the panel subtree.
    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    expect(active).not.toBe(field);
    expect(active).not.toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const el = makeSelect({ variant: 'overlay' });
    await tick();
    const field = el.shadowRoot!.querySelector('[part~="field"]') as HTMLElement;
    field.click();
    await tick();
    expect(el.shadowRoot!.querySelector('[part~="panel"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();

    expect(el.shadowRoot!.querySelector('[part~="panel"]')).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(field);
  });

  it('closes on outside click', async () => {
    const el = makeSelect({ variant: 'dropdown' });
    await tick();
    el.open();
    await tick();
    expect(el.shadowRoot!.querySelector('[part~="panel"]')).not.toBeNull();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    await tick();

    expect(el.shadowRoot!.querySelector('[part~="panel"]')).toBeNull();
  });

  it('closes via the Done button', async () => {
    const el = makeSelect({ variant: 'overlay' });
    await tick();
    el.open();
    await tick();
    const done = el.shadowRoot!.querySelector('[part="done"]') as HTMLElement;
    expect(done).not.toBeNull();
    done.click();
    await tick();
    expect(el.shadowRoot!.querySelector('[part~="panel"]')).toBeNull();
  });

  // ---- closed panel removes tree nodes from the DOM ----

  it('renders the embedded <sp-tree> with tree nodes while open', async () => {
    const el = makeSelect({ variant: 'overlay' });
    await tick();
    el.open();
    await tick();

    const tree = el.shadowRoot!.querySelector('sp-tree') as HTMLElement | null;
    expect(tree).not.toBeNull();
    const treeitems = (tree as HTMLElement & { shadowRoot: ShadowRoot })
      .shadowRoot.querySelectorAll('[role="treeitem"]');
    expect(treeitems.length).toBeGreaterThan(0);
  });

  it('leaves ZERO tree nodes in the DOM when the panel is closed', async () => {
    const el = makeSelect({ variant: 'overlay' });
    await tick();

    // Open then close.
    el.open();
    await tick();
    const treeWhileOpen = el.shadowRoot!.querySelector('sp-tree');
    expect(treeWhileOpen).not.toBeNull();

    el.close();
    await tick();

    // The whole <sp-tree> (and hence every treeitem in its shadow) is gone.
    expect(el.shadowRoot!.querySelector('sp-tree')).toBeNull();
    expect(el.shadowRoot!.querySelector('[part~="panel"]')).toBeNull();
    // No treeitem anywhere under the element.
    expect(el.querySelectorAll('[role="treeitem"]').length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('[role="treeitem"]').length).toBe(0);
  });

  // ---- form participation ----

  it('is form-associated', () => {
    const ctor = customElements.get('sp-tree-select') as unknown as { formAssociated?: boolean };
    expect(ctor.formAssociated).toBe(true);
  });
});
