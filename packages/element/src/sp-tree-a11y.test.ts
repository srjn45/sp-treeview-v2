import { describe, it, expect, beforeEach } from 'vitest';
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';
import './sp-tree.js';

async function tick(): Promise<void> {
  await Promise.resolve();
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

type SpTreeEl = HTMLElement & {
  data: TreeNodeData[];
  store?: TreeStore;
  selection?: string;
  showAllNode?: boolean;
};

describe('<sp-tree> accessibility & interaction', () => {
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
    showAllNode?: boolean;
  } = {}): SpTreeEl {
    const el = document.createElement('sp-tree') as SpTreeEl;
    if (opts.store) el.store = opts.store;
    if (opts.selection) el.selection = opts.selection;
    if (opts.showAllNode) el.showAllNode = true;
    el.data = opts.data ?? sampleData;
    container.appendChild(el);
    return el;
  }

  function tree(el: SpTreeEl): HTMLElement {
    return el.shadowRoot!.querySelector('[role="tree"]') as HTMLElement;
  }

  function pressKey(el: SpTreeEl, key: string, opts: KeyboardEventInit = {}): void {
    tree(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
  }

  function activeId(el: SpTreeEl): string | undefined {
    const active = el.shadowRoot!.querySelector('[role="treeitem"][tabindex="0"]') as HTMLElement | null;
    return active?.dataset['navId'];
  }

  function rowById(el: SpTreeEl, id: string): HTMLElement | null {
    return el.shadowRoot!.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
  }

  // ---- ARIA structure ----

  it('applies role="tree" to the container and role="treeitem" to rows', async () => {
    const el = makeTree();
    await tick();
    expect(tree(el)).not.toBeNull();
    const items = el.shadowRoot!.querySelectorAll('[role="treeitem"]');
    expect(items.length).toBe(3);
  });

  it('sets aria-level, aria-setsize, aria-posinset on rows', async () => {
    const store = new TreeStore({ data: sampleData, initialExpanded: ['a'] });
    const el = makeTree({ store });
    await tick();
    const rowA = rowById(el, 'a')!;
    const rowA1 = rowById(el, 'a1')!;
    expect(rowA.getAttribute('aria-level')).toBe('1');
    expect(rowA.getAttribute('aria-setsize')).toBe('3'); // a, b, c
    expect(rowA.getAttribute('aria-posinset')).toBe('1');
    expect(rowA1.getAttribute('aria-level')).toBe('2');
    expect(rowA1.getAttribute('aria-setsize')).toBe('2'); // a1, a2
    expect(rowA1.getAttribute('aria-posinset')).toBe('1');
  });

  it('sets aria-expanded only on expandable rows and tracks state', async () => {
    const el = makeTree();
    await tick();
    expect(rowById(el, 'a')!.getAttribute('aria-expanded')).toBe('false');
    expect(rowById(el, 'c')!.hasAttribute('aria-expanded')).toBe(false); // leaf
    rowById(el, 'a')!.querySelector<HTMLElement>('[part="toggle"]')!.click();
    await tick();
    expect(rowById(el, 'a')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('sets aria-checked including "mixed" for indeterminate in multi mode', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi', initialChecked: ['a1'], initialExpanded: ['a'] });
    const el = makeTree({ store, selection: 'multi' });
    await tick();
    expect(rowById(el, 'a')!.getAttribute('aria-checked')).toBe('mixed');
    expect(rowById(el, 'a1')!.getAttribute('aria-checked')).toBe('true');
    expect(rowById(el, 'a2')!.getAttribute('aria-checked')).toBe('false');
  });

  it('sets aria-multiselectable only in multi mode', async () => {
    const multi = makeTree({ selection: 'multi' });
    const single = makeTree({ selection: 'single' });
    await tick();
    expect(tree(multi).getAttribute('aria-multiselectable')).toBe('true');
    expect(tree(single).hasAttribute('aria-multiselectable')).toBe(false);
  });

  it('sets aria-disabled on disabled rows', async () => {
    const data: TreeNodeData[] = [{ id: 'x', label: 'X', disabled: true }, { id: 'y', label: 'Y' }];
    const el = makeTree({ data });
    await tick();
    expect(rowById(el, 'x')!.getAttribute('aria-disabled')).toBe('true');
    expect(rowById(el, 'y')!.hasAttribute('aria-disabled')).toBe(false);
  });

  it('sets aria-busy while a node loads', async () => {
    let resolveFn!: (children: TreeNodeData[]) => void;
    const store = new TreeStore({
      data: [{ id: 'lazy', label: 'Lazy', hasChildren: true }],
      loadChildren: () => new Promise<TreeNodeData[]>(r => { resolveFn = r; }),
    });
    const el = makeTree({ store });
    await tick();
    store.expand('lazy');
    await tick();
    expect(rowById(el, 'lazy')!.getAttribute('aria-busy')).toBe('true');
    resolveFn([]);
    await tick();
    expect(rowById(el, 'lazy')!.hasAttribute('aria-busy')).toBe(false);
  });

  // ---- roving tabindex ----

  it('exposes a single tab stop (roving tabindex)', async () => {
    const el = makeTree();
    await tick();
    const zeros = el.shadowRoot!.querySelectorAll('[role="treeitem"][tabindex="0"]');
    expect(zeros.length).toBe(1);
    expect(activeId(el)).toBe('a'); // first row is active by default
  });

  // ---- keyboard navigation ----

  it('ArrowDown / ArrowUp move the active row', async () => {
    const el = makeTree();
    await tick();
    pressKey(el, 'ArrowDown');
    await tick();
    expect(activeId(el)).toBe('b');
    pressKey(el, 'ArrowUp');
    await tick();
    expect(activeId(el)).toBe('a');
  });

  it('Home / End jump to first / last visible row', async () => {
    const el = makeTree();
    await tick();
    pressKey(el, 'End');
    await tick();
    expect(activeId(el)).toBe('c');
    pressKey(el, 'Home');
    await tick();
    expect(activeId(el)).toBe('a');
  });

  it('ArrowRight expands a collapsed row, then moves to first child', async () => {
    const el = makeTree();
    await tick();
    expect(activeId(el)).toBe('a');
    pressKey(el, 'ArrowRight'); // expands a
    await tick();
    expect(rowById(el, 'a')!.getAttribute('aria-expanded')).toBe('true');
    expect(rowById(el, 'a1')).not.toBeNull();
    expect(activeId(el)).toBe('a'); // still on parent after expand
    pressKey(el, 'ArrowRight'); // now moves into first child
    await tick();
    expect(activeId(el)).toBe('a1');
  });

  it('ArrowLeft collapses an expanded row; on a leaf moves to parent', async () => {
    const store = new TreeStore({ data: sampleData, initialExpanded: ['a'] });
    const el = makeTree({ store });
    await tick();
    // move to a1 then left → parent a
    pressKey(el, 'ArrowDown'); // a -> a1
    await tick();
    expect(activeId(el)).toBe('a1');
    pressKey(el, 'ArrowLeft'); // leaf → parent
    await tick();
    expect(activeId(el)).toBe('a');
    pressKey(el, 'ArrowLeft'); // expanded parent → collapse
    await tick();
    expect(rowById(el, 'a')!.getAttribute('aria-expanded')).toBe('false');
    expect(rowById(el, 'a1')).toBeNull();
  });

  it('type-ahead jumps to a label starting with the typed character (buffer resets after a pause)', async () => {
    const data: TreeNodeData[] = [
      { id: 'apple', label: 'Apple' },
      { id: 'banana', label: 'Banana' },
      { id: 'cherry', label: 'Cherry' },
    ];
    const el = makeTree({ data });
    await tick();
    pressKey(el, 'c');
    await tick();
    expect(activeId(el)).toBe('cherry');
    // Buffer accumulates within the window; wait for the reset before a new search.
    await new Promise(r => setTimeout(r, 550));
    pressKey(el, 'b');
    await tick();
    expect(activeId(el)).toBe('banana');
  });

  it('type-ahead accumulates a multi-character prefix within the window', async () => {
    const data: TreeNodeData[] = [
      { id: 'x', label: 'Xylophone' },
      { id: 'sea', label: 'Sea' },
      { id: 'sky', label: 'Sky' },
    ];
    const el = makeTree({ data });
    await tick();
    pressKey(el, 's');
    await tick();
    expect(activeId(el)).toBe('sea'); // first "s…" after the active row
    pressKey(el, 'k'); // buffer becomes "sk"
    await tick();
    expect(activeId(el)).toBe('sky');
  });

  // ---- selection via keyboard ----

  it('Space toggles checkbox selection in multi mode and emits sp-change', async () => {
    const el = makeTree({ selection: 'multi' });
    await tick();
    const events: CustomEvent[] = [];
    el.addEventListener('sp-change', e => events.push(e as CustomEvent));

    pressKey(el, ' '); // toggle 'a'
    await tick();

    expect(rowById(el, 'a')!.getAttribute('aria-checked')).toBe('true');
    expect(events.length).toBe(1);
    const detail = events[0]!.detail as { checked: TreeNodeData[]; allSelected: boolean };
    expect(detail.checked.map(n => n.id)).toContain('a');
    expect(detail.allSelected).toBe(false);
  });

  it('Enter selects a radio in single mode and emits sp-change with {selected}', async () => {
    const el = makeTree({ selection: 'single' });
    await tick();
    const events: CustomEvent[] = [];
    el.addEventListener('sp-change', e => events.push(e as CustomEvent));

    pressKey(el, 'ArrowDown'); // move to b
    await tick();
    pressKey(el, 'Enter'); // select b
    await tick();

    expect(rowById(el, 'b')!.getAttribute('aria-checked')).toBe('true');
    expect(events.length).toBe(1);
    const detail = events[0]!.detail as { selected: TreeNodeData | null };
    expect(detail.selected?.id).toBe('b');
  });

  it('does not select a disabled row via keyboard', async () => {
    const data: TreeNodeData[] = [{ id: 'd', label: 'Disabled', disabled: true }, { id: 'e', label: 'Enabled' }];
    const el = makeTree({ selection: 'multi', data });
    await tick();
    const events: CustomEvent[] = [];
    el.addEventListener('sp-change', e => events.push(e as CustomEvent));
    // active starts on 'd'
    pressKey(el, ' ');
    await tick();
    expect(rowById(el, 'd')!.getAttribute('aria-checked')).toBe('false');
    expect(events.length).toBe(0);
  });

  // ---- expand / collapse events ----

  it('emits sp-expand and sp-collapse with the node in detail', async () => {
    const el = makeTree();
    await tick();
    const expands: CustomEvent[] = [];
    const collapses: CustomEvent[] = [];
    el.addEventListener('sp-expand', e => expands.push(e as CustomEvent));
    el.addEventListener('sp-collapse', e => collapses.push(e as CustomEvent));

    pressKey(el, 'ArrowRight'); // expand a
    await tick();
    expect(expands.length).toBe(1);
    expect((expands[0]!.detail as { node: TreeNodeData }).node.id).toBe('a');

    pressKey(el, 'ArrowLeft'); // collapse a
    await tick();
    expect(collapses.length).toBe(1);
    expect((collapses[0]!.detail as { node: TreeNodeData }).node.id).toBe('a');
  });

  it('toggle button click emits sp-expand / sp-collapse', async () => {
    const el = makeTree();
    await tick();
    const expands: CustomEvent[] = [];
    el.addEventListener('sp-expand', e => expands.push(e as CustomEvent));
    rowById(el, 'a')!.querySelector<HTMLElement>('[part="toggle"]')!.click();
    await tick();
    expect(expands.length).toBe(1);
    expect((expands[0]!.detail as { node: TreeNodeData }).node.id).toBe('a');
  });

  // ---- showAllNode ----

  it('renders the All row as a treeitem wired to setAllChecked with allSelected flag', async () => {
    const el = makeTree({ selection: 'multi', showAllNode: true });
    await tick();
    const allRow = el.shadowRoot!.querySelector('[part~="all-row"]') as HTMLElement;
    expect(allRow).not.toBeNull();
    expect(allRow.getAttribute('role')).toBe('treeitem');
    // All row is the first tab stop
    expect(activeId(el)).toBe('__sp_all__');

    const events: CustomEvent[] = [];
    el.addEventListener('sp-change', e => events.push(e as CustomEvent));

    allRow.click(); // setAllChecked(true)
    await tick();

    expect(events.length).toBe(1);
    const detail = events[0]!.detail as { checked: TreeNodeData[]; allSelected: boolean };
    expect(detail.allSelected).toBe(true);
    expect(detail.checked.map(n => n.id).sort()).toEqual(['a', 'b', 'c']); // topmost fully-checked
    // Every visible checkbox is checked
    for (const r of el.shadowRoot!.querySelectorAll('[data-id] [part="checkbox"]')) {
      expect((r as HTMLElement).dataset['checked']).toBe('checked');
    }
  });

  it('All row shows aria-checked "mixed" when only some nodes are checked', async () => {
    const store = new TreeStore({ data: sampleData, selection: 'multi', initialChecked: ['c'] });
    const el = makeTree({ store, selection: 'multi', showAllNode: true });
    await tick();
    const allRow = el.shadowRoot!.querySelector('[part~="all-row"]') as HTMLElement;
    expect(allRow.getAttribute('aria-checked')).toBe('mixed');
  });

  it('keyboard navigation includes the All row', async () => {
    const el = makeTree({ selection: 'multi', showAllNode: true });
    await tick();
    expect(activeId(el)).toBe('__sp_all__');
    pressKey(el, 'ArrowDown');
    await tick();
    expect(activeId(el)).toBe('a');
    pressKey(el, 'ArrowUp');
    await tick();
    expect(activeId(el)).toBe('__sp_all__');
  });
});
