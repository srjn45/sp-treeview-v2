import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';
import './sp-tree.js';

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/** Wait past the search debounce window, then let Lit settle. */
async function settleSearch(el: SpTreeEl): Promise<void> {
  await new Promise(r => setTimeout(r, 300));
  await el.updateComplete;
  await tick();
  await el.updateComplete;
}

const searchData: TreeNodeData[] = [
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
];

type SpTreeEl = HTMLElement & {
  data: TreeNodeData[];
  store?: TreeStore;
  selection?: string;
  searchable?: boolean;
  updateComplete: Promise<boolean>;
};

describe('<sp-tree> search + lazy UI', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => container.remove();
  });

  function makeTree(opts: {
    store?: TreeStore;
    data?: TreeNodeData[];
    searchable?: boolean;
  } = {}): SpTreeEl {
    const el = document.createElement('sp-tree') as SpTreeEl;
    if (opts.store) el.store = opts.store;
    if (opts.searchable) el.searchable = true;
    el.data = opts.data ?? searchData;
    container.appendChild(el);
    return el;
  }

  function typeSearch(el: SpTreeEl, value: string): void {
    const input = el.shadowRoot!.querySelector('[part="search-input"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  // ---- search box presence ----

  it('renders a search input only when searchable', async () => {
    const plain = makeTree();
    await plain.updateComplete;
    expect(plain.shadowRoot!.querySelector('[part="search-input"]')).toBeNull();

    const el = makeTree({ searchable: true });
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[part="search-input"]')).not.toBeNull();
  });

  // ---- debounce ----

  it('debounces input by 250ms before calling store.setFilter', async () => {
    const store = new TreeStore({ data: searchData });
    const setFilter = vi.spyOn(store, 'setFilter');
    const el = makeTree({ store, searchable: true });
    await el.updateComplete;

    typeSearch(el, 'One');
    // Not called synchronously — waiting on the debounce.
    expect(setFilter).not.toHaveBeenCalled();

    await settleSearch(el);
    expect(setFilter).toHaveBeenCalledWith('One');
  });

  // ---- reveal + highlight ----

  it('typing reveals matching descendants with ancestors expanded', async () => {
    const el = makeTree({ searchable: true });
    await el.updateComplete;
    const shadow = el.shadowRoot!;

    // Nothing expanded initially: only root rows present.
    expect(shadow.querySelector('[data-id="a1"]')).toBeNull();

    typeSearch(el, 'One');
    await settleSearch(el);

    // 'One' matches a1 (Alpha One) and b1 (Bravo One); ancestors a and b revealed.
    expect(shadow.querySelector('[data-id="a"]')).not.toBeNull();
    expect(shadow.querySelector('[data-id="a1"]')).not.toBeNull();
    expect(shadow.querySelector('[data-id="b1"]')).not.toBeNull();
    // Non-matching, non-ancestor row drops out of the DOM.
    expect(shadow.querySelector('[data-id="a2"]')).toBeNull();
  });

  it('wraps matched substrings in <mark part="match">', async () => {
    const el = makeTree({ searchable: true });
    await el.updateComplete;

    typeSearch(el, 'One');
    await settleSearch(el);

    const mark = el.shadowRoot!
      .querySelector('[data-id="a1"] [part="label"] mark[part="match"]') as HTMLElement;
    expect(mark).not.toBeNull();
    expect(mark.textContent).toBe('One');
  });

  // ---- empty state ----

  it('shows the "No results" empty state when the filter yields zero rows', async () => {
    const el = makeTree({ searchable: true });
    await el.updateComplete;

    typeSearch(el, 'zzz-nothing');
    await settleSearch(el);

    const shadow = el.shadowRoot!;
    expect(shadow.querySelectorAll('[part~="row"]').length).toBe(0);
    const empty = shadow.querySelector('[part="empty"]');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('No results');
  });

  // ---- clear restores expansion ----

  it('clear (×) button restores the pre-filter expansion', async () => {
    // Pre-expand only 'a' so the restore target is a non-trivial snapshot.
    const store = new TreeStore({ data: searchData, initialExpanded: ['a'] });
    const el = makeTree({ store, searchable: true });
    await el.updateComplete;
    const shadow = el.shadowRoot!;

    // Filter to Bravo's child: expands b, non-matching a-subtree drops out.
    typeSearch(el, 'Bravo One');
    await settleSearch(el);
    expect(shadow.querySelector('[data-id="b1"]')).not.toBeNull();
    expect(shadow.querySelector('[data-id="a1"]')).toBeNull();

    const clearBtn = shadow.querySelector('[part="search-clear"]') as HTMLElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();
    await el.updateComplete;
    await tick();
    await el.updateComplete;

    // Snapshot restored: 'a' expanded again, 'b' collapsed again.
    expect(shadow.querySelector('[data-id="a1"]')).not.toBeNull();
    expect(shadow.querySelector('[data-id="b1"]')).toBeNull();
    // Search input reset and clear button gone.
    const input = shadow.querySelector('[part="search-input"]') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(shadow.querySelector('[part="search-clear"]')).toBeNull();
  });

  // ---- load error → retry ----

  it('fires sp-load-error and retry calls store.retryLoad on a failed lazy load', async () => {
    let rejectFn!: (e: Error) => void;
    const lazyData: TreeNodeData[] = [{ id: 'lz', label: 'Lazy', hasChildren: true }];
    const store = new TreeStore({
      data: lazyData,
      loadChildren: () => new Promise<TreeNodeData[]>((_, r) => { rejectFn = r; }),
    });
    const el = makeTree({ store });
    await el.updateComplete;

    const errors: Array<{ node: TreeNodeData; error: Error }> = [];
    el.addEventListener('sp-load-error', (e) => {
      errors.push((e as CustomEvent).detail);
    });

    store.expand('lz');
    await tick();
    rejectFn(new Error('boom'));
    await tick();
    await el.updateComplete;

    // sp-load-error dispatched with {node, error}.
    expect(errors.length).toBe(1);
    expect(errors[0]!.node.id).toBe('lz');
    expect(errors[0]!.error.message).toBe('boom');

    // Error row + retry button rendered.
    const errorRow = el.shadowRoot!.querySelector('[part~="error"]');
    expect(errorRow).not.toBeNull();
    const retryBtn = el.shadowRoot!.querySelector('[part="retry"]') as HTMLElement;
    expect(retryBtn).not.toBeNull();

    // Clicking retry re-attempts the load via the store.
    const retrySpy = vi.spyOn(store, 'retryLoad');
    retryBtn.click();
    expect(retrySpy).toHaveBeenCalledWith('lz');
  });
});
