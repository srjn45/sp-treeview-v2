import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';
import './sp-tree.js';

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const sampleData: TreeNodeData[] = [
  {
    id: 'a',
    label: 'Node A',
    children: [
      { id: 'a1', label: 'Node A1' },
      { id: 'a2', label: 'Node A2' },
    ],
  },
  {
    id: 'b',
    label: 'Node B',
    children: [{ id: 'b1', label: 'Node B1' }],
  },
  { id: 'c', label: 'Node C' },
];

type SpTreeEl = HTMLElement & {
  data: TreeNodeData[];
  store?: TreeStore;
  selection?: string;
};

describe('<sp-tree> rendering', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => container.remove();
  });

  function makeTree(opts: {
    store?: TreeStore;
    selection?: string;
    data?: TreeNodeData[];
  } = {}): SpTreeEl {
    const el = document.createElement('sp-tree') as SpTreeEl;
    if (opts.store) el.store = opts.store;
    if (opts.selection) el.selection = opts.selection;
    el.data = opts.data ?? sampleData;
    container.appendChild(el);
    return el;
  }

  it('renders visible rows as flat list (root nodes only when nothing expanded)', async () => {
    const el = makeTree();
    await tick();
    const rows = el.shadowRoot!.querySelectorAll('[part~="row"]');
    expect(rows.length).toBe(3); // a, b, c
  });

  it('rows are indented by level', async () => {
    const store = new TreeStore({ data: sampleData, initialExpanded: ['a'] });
    const el = makeTree({ store });
    await tick();
    const shadow = el.shadowRoot!;
    const rows = shadow.querySelectorAll('[part~="row"]');
    expect(rows.length).toBe(5); // a, a1, a2, b, c

    const rowA = shadow.querySelector('[data-id="a"]') as HTMLElement;
    const rowA1 = shadow.querySelector('[data-id="a1"]') as HTMLElement;
    expect(rowA?.dataset['level']).toBe('1');
    expect(rowA1?.dataset['level']).toBe('2');
  });

  it('collapsed subtree rows are absent from DOM', async () => {
    const el = makeTree();
    await tick();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-id="a1"]')).toBeNull();
    expect(shadow.querySelector('[data-id="a2"]')).toBeNull();
  });

  it('toggle click expands a node — children appear in DOM', async () => {
    const el = makeTree();
    await tick();
    const shadow = el.shadowRoot!;

    const toggle = shadow.querySelector('[data-id="a"] [part="toggle"]') as HTMLElement;
    expect(toggle).not.toBeNull();
    toggle.click();
    await tick();

    expect(shadow.querySelector('[data-id="a1"]')).not.toBeNull();
    expect(shadow.querySelector('[data-id="a2"]')).not.toBeNull();
  });

  it('toggle click collapses an expanded node — children absent', async () => {
    const store = new TreeStore({ data: sampleData, initialExpanded: ['a'] });
    const el = makeTree({ store });
    await tick();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-id="a1"]')).not.toBeNull();

    const toggle = shadow.querySelector('[data-id="a"] [part="toggle"]') as HTMLElement;
    toggle.click();
    await tick();

    expect(shadow.querySelector('[data-id="a1"]')).toBeNull();
  });

  it('checkbox reflects checked state', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi', initialChecked: ['c'] });
    const el = makeTree({ store, selection: 'multi' });
    await tick();
    const checkboxC = el.shadowRoot!.querySelector('[data-id="c"] [part="checkbox"]') as HTMLElement;
    expect(checkboxC).not.toBeNull();
    expect(checkboxC.dataset['checked']).toBe('checked');
  });

  it('checkbox reflects indeterminate state when only a child is checked', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi', initialChecked: ['a1'] });
    const el = makeTree({ store, selection: 'multi' });
    await tick();
    const checkboxA = el.shadowRoot!.querySelector('[data-id="a"] [part="checkbox"]') as HTMLElement;
    expect(checkboxA).not.toBeNull();
    expect(checkboxA.dataset['checked']).toBe('indeterminate');
  });

  it('checkbox reflects unchecked state', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi' });
    const el = makeTree({ store, selection: 'multi' });
    await tick();
    const checkboxA = el.shadowRoot!.querySelector('[data-id="a"] [part="checkbox"]') as HTMLElement;
    expect(checkboxA).not.toBeNull();
    expect(checkboxA.dataset['checked']).toBe('unchecked');
  });

  it('radio reflects selected state', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'single' });
    store.select('c');
    const el = makeTree({ store, selection: 'single' });
    await tick();
    const shadow = el.shadowRoot!;
    const radioC = shadow.querySelector('[data-id="c"] [part="radio"]') as HTMLElement;
    expect(radioC).not.toBeNull();
    expect(radioC.dataset['selected']).toBe('true');
    const radioA = shadow.querySelector('[data-id="a"] [part="radio"]') as HTMLElement;
    expect(radioA.dataset['selected']).toBe('false');
  });

  it('spinner shows when a node is loading', async () => {
    let resolveFn!: (children: TreeNodeData[]) => void;
    const lazyData: TreeNodeData[] = [{ id: 'lazy', label: 'Lazy', hasChildren: true }];
    const store = new TreeStore({
      data: lazyData,
      loadChildren: () => new Promise<TreeNodeData[]>(r => { resolveFn = r; }),
    });
    const el = makeTree({ store });
    await tick();

    store.expand('lazy');
    await tick();

    const spinner = el.shadowRoot!.querySelector('[part="spinner"]');
    expect(spinner).not.toBeNull();

    resolveFn([]);
    await tick();
  });

  it('error and retry markup shows on loadError', async () => {
    let rejectFn!: (e: Error) => void;
    const lazyData: TreeNodeData[] = [{ id: 'lazy2', label: 'Lazy2', hasChildren: true }];
    const store = new TreeStore({
      data: lazyData,
      loadChildren: () => new Promise<TreeNodeData[]>((_, r) => { rejectFn = r; }),
    });
    const el = makeTree({ store });
    await tick();

    store.expand('lazy2');
    await tick();
    rejectFn(new Error('Load failed'));
    await tick();

    const errorEl = el.shadowRoot!.querySelector('[part~="error"]');
    expect(errorEl).not.toBeNull();
    const retryBtn = el.shadowRoot!.querySelector('[part="retry"]');
    expect(retryBtn).not.toBeNull();
  });

  it('::part attributes present on row, toggle, checkbox, label', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi' });
    const el = makeTree({ store, selection: 'multi' });
    await tick();
    const shadow = el.shadowRoot!;

    expect(shadow.querySelector('[part~="row"]')).not.toBeNull();
    expect(shadow.querySelector('[part="toggle"]')).not.toBeNull();
    expect(shadow.querySelector('[part="checkbox"]')).not.toBeNull();
    expect(shadow.querySelector('[part="label"]')).not.toBeNull();
  });

  it('radio parts present in single-selection mode', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'single' });
    const el = makeTree({ store, selection: 'single' });
    await tick();
    expect(el.shadowRoot!.querySelector('[part="radio"]')).not.toBeNull();
  });

  it('re-renders when store emits a change', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi' });
    const el = makeTree({ store, selection: 'multi' });
    await tick();

    let checkboxC = el.shadowRoot!.querySelector('[data-id="c"] [part="checkbox"]') as HTMLElement;
    expect(checkboxC.dataset['checked']).toBe('unchecked');

    store.setChecked('c', true);
    await tick();

    checkboxC = el.shadowRoot!.querySelector('[data-id="c"] [part="checkbox"]') as HTMLElement;
    expect(checkboxC.dataset['checked']).toBe('checked');
  });

  it('unsubscribes on disconnect — no errors after removal', async () => {
    const store = new TreeStore({ data: sampleData });
    const el = makeTree({ store });
    await tick();

    const subscribeSpy = vi.spyOn(store, 'subscribe');
    el.remove();

    // Store changes after removal should not cause errors
    store.expand('a');
    await tick();

    expect(subscribeSpy).not.toHaveBeenCalled();
  });
});
