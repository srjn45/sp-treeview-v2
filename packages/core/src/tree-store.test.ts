import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TreeStore } from './tree-store.js';
import type { TreeNodeData, TreeChangeEvent } from './types.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, label: string, children?: TreeNodeData[]): TreeNodeData {
  return children !== undefined ? { id, label, children } : { id, label };
}

function leaf(id: string, label = id): TreeNodeData {
  return { id, label };
}

function branch(id: string, children: TreeNodeData[], label = id): TreeNodeData {
  return { id, label, children };
}

function lazyBranch(id: string, label = id): TreeNodeData {
  return { id, label, hasChildren: true };
}

// ---------------------------------------------------------------------------
// §3.2 rows() projection
// ---------------------------------------------------------------------------

describe('rows() — flat projection', () => {
  it('returns [] for empty data', () => {
    const store = new TreeStore({ data: [] });
    expect(store.rows()).toEqual([]);
  });

  it('returns root nodes at level 1 with correct setSize / posInSet', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b'), leaf('c')] });
    const rows = store.rows();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ level: 1, setSize: 3, posInSet: 1 });
    expect(rows[1]).toMatchObject({ level: 1, setSize: 3, posInSet: 2 });
    expect(rows[2]).toMatchObject({ level: 1, setSize: 3, posInSet: 3 });
  });

  it('omits children of collapsed nodes', () => {
    const store = new TreeStore({
      data: [branch('root', [leaf('child1'), leaf('child2')])],
    });
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]?.node.id).toBe('root');
  });

  it('includes children of an expanded node', () => {
    const store = new TreeStore({
      data: [branch('root', [leaf('c1'), leaf('c2')])],
    });
    store.expand('root');
    const rows = store.rows();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ node: expect.objectContaining({ id: 'root' }), level: 1 });
    expect(rows[1]).toMatchObject({ node: expect.objectContaining({ id: 'c1' }), level: 2 });
    expect(rows[2]).toMatchObject({ node: expect.objectContaining({ id: 'c2' }), level: 2 });
  });

  it('computes setSize per parent independently', () => {
    const store = new TreeStore({
      data: [
        branch('a', [leaf('a1'), leaf('a2'), leaf('a3')]),
        branch('b', [leaf('b1'), leaf('b2')]),
      ],
    });
    store.expand('a');
    store.expand('b');
    const rows = store.rows();
    // Root: 2 nodes
    expect(rows[0]).toMatchObject({ setSize: 2, posInSet: 1 });
    // a's children: 3 nodes
    expect(rows[1]).toMatchObject({ setSize: 3, posInSet: 1 });
    expect(rows[2]).toMatchObject({ setSize: 3, posInSet: 2 });
    expect(rows[3]).toMatchObject({ setSize: 3, posInSet: 3 });
    // b (root, posInSet 2)
    expect(rows[4]).toMatchObject({ setSize: 2, posInSet: 2 });
    // b's children: 2 nodes
    expect(rows[5]).toMatchObject({ setSize: 2, posInSet: 1 });
    expect(rows[6]).toMatchObject({ setSize: 2, posInSet: 2 });
  });

  it('traverses multiple levels of expansion', () => {
    const store = new TreeStore({
      data: [
        branch('l1', [
          branch('l2', [
            leaf('l3a'),
            leaf('l3b'),
          ]),
        ]),
      ],
    });
    store.expand('l1');
    store.expand('l2');
    const rows = store.rows();
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ level: 1, posInSet: 1, setSize: 1 });
    expect(rows[1]).toMatchObject({ level: 2, posInSet: 1, setSize: 1 });
    expect(rows[2]).toMatchObject({ level: 3, posInSet: 1, setSize: 2 });
    expect(rows[3]).toMatchObject({ level: 3, posInSet: 2, setSize: 2 });
  });

  it('only expands nodes that have internal children (loaded branch)', () => {
    // children:[] is an expandable-empty loaded branch; no rows come from it
    const store = new TreeStore({
      data: [branch('empty', [])],
    });
    store.expand('empty');
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]).toMatchObject({ expandable: true, expanded: true });
  });
});

// ---------------------------------------------------------------------------
// row field semantics
// ---------------------------------------------------------------------------

describe('row fields', () => {
  it('expandable=true for node with children array (even empty)', () => {
    const store = new TreeStore({ data: [branch('p', [])] });
    expect(store.rows()[0]?.expandable).toBe(true);
  });

  it('expandable=true for lazy node (hasChildren:true, no children)', () => {
    const store = new TreeStore({ data: [lazyBranch('lazy')] });
    expect(store.rows()[0]?.expandable).toBe(true);
  });

  it('expandable=false for leaf nodes', () => {
    const store = new TreeStore({ data: [leaf('leaf')] });
    expect(store.rows()[0]?.expandable).toBe(false);
  });

  it('expanded reflects expansion state', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    expect(store.rows()[0]?.expanded).toBe(false);
    store.expand('p');
    expect(store.rows()[0]?.expanded).toBe(true);
  });

  it('stub fields default to safe values', () => {
    const store = new TreeStore({ data: [leaf('x')] });
    const row = store.rows()[0];
    expect(row?.checked).toBe('unchecked');
    expect(row?.selected).toBe(false);
    expect(row?.loading).toBe(false);
    expect(row?.loadError).toBeNull();
    expect(row?.matched).toBe(false);
  });

  it('node field references the original TreeNodeData object', () => {
    const node = leaf('a');
    const store = new TreeStore({ data: [node] });
    expect(store.rows()[0]?.node).toBe(node);
  });
});

// ---------------------------------------------------------------------------
// expansion commands
// ---------------------------------------------------------------------------

describe('expansion commands', () => {
  it('expand() adds children to rows()', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    expect(store.rows()).toHaveLength(2);
  });

  it('expand() is a no-op for unknown id', () => {
    const store = new TreeStore({ data: [leaf('x')] });
    expect(() => store.expand('nonexistent')).not.toThrow();
    expect(store.rows()).toHaveLength(1);
  });

  it('expand() is a no-op when already expanded', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    const rows1 = store.rows();
    store.expand('p'); // second call
    expect(store.rows()).toBe(rows1); // same cached reference
  });

  it('collapse() hides children from rows()', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    store.collapse('p');
    expect(store.rows()).toHaveLength(1);
  });

  it('collapse() is a no-op when already collapsed', () => {
    const store = new TreeStore({ data: [leaf('x')] });
    expect(() => store.collapse('x')).not.toThrow();
  });

  it('toggleExpanded() expands a collapsed node', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.toggleExpanded('p');
    expect(store.rows()).toHaveLength(2);
  });

  it('toggleExpanded() collapses an expanded node', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    store.toggleExpanded('p');
    expect(store.rows()).toHaveLength(1);
  });

  it('initialExpanded pre-expands given ids', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c')])],
      initialExpanded: ['p'],
    });
    expect(store.rows()).toHaveLength(2);
  });

  it('initialExpanded silently ignores unknown ids', () => {
    expect(() => new TreeStore({
      data: [],
      initialExpanded: ['ghost'],
    })).not.toThrow();
  });

  it('collapse() of a parent also hides its expanded grandchildren', () => {
    const store = new TreeStore({
      data: [branch('p', [branch('c', [leaf('gc')])])],
    });
    store.expand('p');
    store.expand('c');
    expect(store.rows()).toHaveLength(3);
    store.collapse('p');
    expect(store.rows()).toHaveLength(1);
    // re-expand: 'c' is still in expanded set, grandchild reappears
    store.expand('p');
    expect(store.rows()).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// rows() cache invalidation
// ---------------------------------------------------------------------------

describe('rows() cache invalidation', () => {
  it('returns same reference when cache valid', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const r1 = store.rows();
    const r2 = store.rows();
    expect(r1).toBe(r2);
  });

  it('invalidates on expand()', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    const r1 = store.rows();
    store.expand('p');
    expect(store.rows()).not.toBe(r1);
  });

  it('invalidates on collapse()', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    const r1 = store.rows();
    store.collapse('p');
    expect(store.rows()).not.toBe(r1);
  });

  it('invalidates on setData()', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const r1 = store.rows();
    store.setData([leaf('b')]);
    expect(store.rows()).not.toBe(r1);
  });

  it('invalidates on addNode()', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const r1 = store.rows();
    store.addNode(null, leaf('b'));
    expect(store.rows()).not.toBe(r1);
  });

  it('invalidates on removeNode()', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')] });
    const r1 = store.rows();
    store.removeNode('a');
    expect(store.rows()).not.toBe(r1);
  });

  it('invalidates on updateNode()', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const r1 = store.rows();
    store.updateNode('a', { label: 'updated' });
    expect(store.rows()).not.toBe(r1);
  });
});

// ---------------------------------------------------------------------------
// duplicate-id rejection
// ---------------------------------------------------------------------------

describe('duplicate-id rejection', () => {
  it('throws on setData with duplicate ids at root level', () => {
    expect(() => new TreeStore({ data: [leaf('x'), leaf('x')] }))
      .toThrow(/Duplicate node id: "x"/);
  });

  it('throws on setData with duplicate ids across levels', () => {
    expect(() => new TreeStore({
      data: [branch('a', [leaf('dup')]), leaf('dup')],
    })).toThrow(/Duplicate node id: "dup"/);
  });

  it('throws on setData with duplicate ids within a subtree', () => {
    expect(() => new TreeStore({
      data: [branch('root', [leaf('child'), leaf('child')])],
    })).toThrow(/Duplicate node id: "child"/);
  });

  it('throws on addNode with id already in tree', () => {
    const store = new TreeStore({ data: [leaf('existing')] });
    expect(() => store.addNode(null, leaf('existing')))
      .toThrow(/Duplicate node id: "existing"/);
  });

  it('throws on addNode with duplicate id within incoming subtree', () => {
    const store = new TreeStore({ data: [] });
    expect(() => store.addNode(null, branch('p', [leaf('dup'), leaf('dup')])))
      .toThrow(/Duplicate node id: "dup"/);
  });

  it('throws on addNode when incoming subtree conflicts with existing node', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.addNode(null, branch('new', [leaf('a')])))
      .toThrow(/Duplicate node id: "a"/);
  });
});

// ---------------------------------------------------------------------------
// setData()
// ---------------------------------------------------------------------------

describe('setData()', () => {
  it('replaces the tree completely', () => {
    const store = new TreeStore({ data: [leaf('old')] });
    store.setData([leaf('new')]);
    expect(store.rows()[0]?.node.id).toBe('new');
    expect(store.getNode('old')).toBeUndefined();
  });

  it('resets expansion state', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    store.setData([branch('p', [leaf('c')])]);
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]?.expanded).toBe(false);
  });

  it('correctly rejects duplicates in replacement data', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.setData([leaf('x'), leaf('x')])).toThrow(/Duplicate/);
    // original data still queryable after a failed setData
    // (the store is reset even on throw — noted as implementation detail)
  });
});

// ---------------------------------------------------------------------------
// addNode()
// ---------------------------------------------------------------------------

describe('addNode()', () => {
  it('adds a node to the root when parentId is null', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    store.addNode(null, leaf('b'));
    const ids = store.rows().map(r => r.node.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(store.rows()).toHaveLength(2);
  });

  it('adds a node to a parent when parentId given', () => {
    const store = new TreeStore({ data: [branch('p', [])] });
    store.expand('p');
    store.addNode('p', leaf('child'));
    expect(store.rows()).toHaveLength(2);
    expect(store.rows()[1]?.node.id).toBe('child');
  });

  it('adds an entire subtree', () => {
    const store = new TreeStore({ data: [] });
    store.addNode(null, branch('root', [leaf('c1'), leaf('c2')]));
    store.expand('root');
    expect(store.rows()).toHaveLength(3);
  });

  it('throws for nonexistent parentId', () => {
    const store = new TreeStore({ data: [] });
    expect(() => store.addNode('ghost', leaf('x'))).toThrow(/Parent node not found: "ghost"/);
  });

  it('newly added node is queryable via getNode()', () => {
    const store = new TreeStore({ data: [] });
    store.addNode(null, leaf('x'));
    expect(store.getNode('x')?.id).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// removeNode()
// ---------------------------------------------------------------------------

describe('removeNode()', () => {
  it('removes a root node', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')] });
    store.removeNode('a');
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]?.node.id).toBe('b');
  });

  it('removes a child node', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c1'), leaf('c2')])] });
    store.expand('p');
    store.removeNode('c1');
    expect(store.rows()).toHaveLength(2);
    expect(store.rows()[1]?.node.id).toBe('c2');
  });

  it('removes an entire subtree (descendants gone too)', () => {
    const store = new TreeStore({
      data: [branch('p', [branch('c', [leaf('gc')])])],
    });
    store.removeNode('p');
    expect(store.rows()).toHaveLength(0);
    expect(store.getNode('p')).toBeUndefined();
    expect(store.getNode('c')).toBeUndefined();
    expect(store.getNode('gc')).toBeUndefined();
  });

  it('clears expansion state for removed nodes', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    store.expand('p');
    store.removeNode('p');
    // re-add a node with same id — it should start collapsed
    store.addNode(null, branch('p', [leaf('c')]));
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]?.expanded).toBe(false);
  });

  it('is a no-op for unknown id', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.removeNode('ghost')).not.toThrow();
    expect(store.rows()).toHaveLength(1);
  });

  it('updates setSize of siblings after removal', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b'), leaf('c')] });
    store.removeNode('b');
    const rows = store.rows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ setSize: 2, posInSet: 1 });
    expect(rows[1]).toMatchObject({ setSize: 2, posInSet: 2 });
  });
});

// ---------------------------------------------------------------------------
// updateNode()
// ---------------------------------------------------------------------------

describe('updateNode()', () => {
  it('updates node label in rows()', () => {
    const store = new TreeStore({ data: [leaf('a', 'Old Label')] });
    store.updateNode('a', { label: 'New Label' });
    expect(store.rows()[0]?.node.label).toBe('New Label');
  });

  it('can add children to a leaf node', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    store.updateNode('a', { children: [leaf('child')] });
    store.expand('a');
    expect(store.rows()).toHaveLength(1); // children are on the data obj but not internal
    // Note: updateNode only updates node.data; internal children structure is separate
    // The expandable field reflects data.children being defined
    expect(store.rows()[0]?.expandable).toBe(true);
  });

  it('is a no-op for unknown id', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.updateNode('ghost', { label: 'x' })).not.toThrow();
    expect(store.rows()[0]?.node.label).toBe('a');
  });

  it('updated data is returned by getNode()', () => {
    const store = new TreeStore({ data: [leaf('a', 'before')] });
    store.updateNode('a', { label: 'after' });
    expect(store.getNode('a')?.label).toBe('after');
  });

  it('can mark a leaf as disabled', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    store.updateNode('a', { disabled: true });
    expect(store.getNode('a')?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getNode()
// ---------------------------------------------------------------------------

describe('getNode()', () => {
  it('returns the node data by id', () => {
    const node = leaf('x');
    const store = new TreeStore({ data: [node] });
    expect(store.getNode('x')).toBe(node);
  });

  it('finds deeply nested nodes', () => {
    const gc = leaf('gc');
    const store = new TreeStore({
      data: [branch('p', [branch('c', [gc])])],
    });
    expect(store.getNode('gc')).toBe(gc);
  });

  it('returns undefined for unknown id', () => {
    const store = new TreeStore({ data: [] });
    expect(store.getNode('nope')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// subscribe() / unsubscribe
// ---------------------------------------------------------------------------

describe('subscribe()', () => {
  it('listener is called on expand()', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(listener);
    store.expand('p');
    expect(listener).toHaveBeenCalledWith({ type: 'rows' });
  });

  it('listener is called on collapse()', () => {
    const store = new TreeStore({ data: [branch('p', [leaf('c')])] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(listener);
    store.expand('p');
    listener.mockClear();
    store.collapse('p');
    expect(listener).toHaveBeenCalledWith({ type: 'rows' });
  });

  it('listener is called on setData()', () => {
    const store = new TreeStore({ data: [] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(listener);
    store.setData([leaf('a')]);
    expect(listener).toHaveBeenCalledWith({ type: 'rows' });
  });

  it('listener is called on addNode()', () => {
    const store = new TreeStore({ data: [] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(listener);
    store.addNode(null, leaf('a'));
    expect(listener).toHaveBeenCalledWith({ type: 'rows' });
  });

  it('listener is called on removeNode()', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(listener);
    store.removeNode('a');
    expect(listener).toHaveBeenCalledWith({ type: 'rows' });
  });

  it('listener is called on updateNode()', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(listener);
    store.updateNode('a', { label: 'new' });
    expect(listener).toHaveBeenCalledWith({ type: 'rows' });
  });

  it('multiple listeners all receive events', () => {
    const store = new TreeStore({ data: [] });
    const l1 = vi.fn<[TreeChangeEvent], void>();
    const l2 = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(l1);
    store.subscribe(l2);
    store.addNode(null, leaf('a'));
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });

  it('unsubscribe stops the listener from receiving events', () => {
    const store = new TreeStore({ data: [] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.addNode(null, leaf('a'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe removes only the specific listener', () => {
    const store = new TreeStore({ data: [] });
    const l1 = vi.fn<[TreeChangeEvent], void>();
    const l2 = vi.fn<[TreeChangeEvent], void>();
    store.subscribe(l1);
    const unsub2 = store.subscribe(l2);
    unsub2();
    store.addNode(null, leaf('a'));
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).not.toHaveBeenCalled();
  });

  it('calling unsubscribe twice is safe', () => {
    const store = new TreeStore({ data: [] });
    const listener = vi.fn<[TreeChangeEvent], void>();
    const unsub = store.subscribe(listener);
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it('expand() no-op for unknown id does NOT emit', () => {
    const store = new TreeStore({ data: [] });
    const listener = vi.fn();
    store.subscribe(listener);
    store.expand('ghost');
    expect(listener).not.toHaveBeenCalled();
  });

  it('collapse() no-op for already-collapsed does NOT emit', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    const listener = vi.fn();
    store.subscribe(listener);
    store.collapse('a');
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// stub API coverage (so stubs are not below 90% function coverage)
// ---------------------------------------------------------------------------

describe('stub commands (smoke tests)', () => {
  it('getChecked() returns empty array', () => {
    const store = new TreeStore({ data: [] });
    expect(store.getChecked()).toEqual([]);
  });

  it('getCheckedLeaves() returns empty array', () => {
    const store = new TreeStore({ data: [] });
    expect(store.getCheckedLeaves()).toEqual([]);
  });

  it('getSelected() returns null', () => {
    const store = new TreeStore({ data: [] });
    expect(store.getSelected()).toBeNull();
  });

  it('setChecked() is a no-op stub', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.setChecked('a', true)).not.toThrow();
  });

  it('toggleChecked() is a no-op stub', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.toggleChecked('a')).not.toThrow();
  });

  it('select() is a no-op stub', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.select('a')).not.toThrow();
  });

  it('setAllChecked() is a no-op stub', () => {
    const store = new TreeStore({ data: [] });
    expect(() => store.setAllChecked(true)).not.toThrow();
  });

  it('setFilter() is a no-op stub', () => {
    const store = new TreeStore({ data: [] });
    expect(() => store.setFilter('query')).not.toThrow();
  });

  it('clearFilter() is a no-op stub', () => {
    const store = new TreeStore({ data: [] });
    expect(() => store.clearFilter()).not.toThrow();
  });

  it('retryLoad() is a no-op stub', () => {
    const store = new TreeStore({ data: [] });
    expect(() => store.retryLoad('a')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// makeNode helper (used above to verify it works)
// ---------------------------------------------------------------------------

describe('makeNode helper', () => {
  it('creates a node without children when omitted', () => {
    const n = makeNode('a', 'A');
    expect(n.children).toBeUndefined();
  });

  it('creates a node with children when provided', () => {
    const n = makeNode('a', 'A', [leaf('b')]);
    expect(n.children).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// helpers for disabled nodes
// ---------------------------------------------------------------------------

function disabledLeaf(id: string): TreeNodeData {
  return { id, label: id, disabled: true };
}

function disabledBranch(id: string, children: TreeNodeData[]): TreeNodeData {
  return { id, label: id, children, disabled: true };
}

// ---------------------------------------------------------------------------
// §3.2 / §3.3 — multi-mode: setChecked / cascade down + up
// ---------------------------------------------------------------------------

describe('multi-mode: setChecked basic', () => {
  it('is a no-op when selection mode is not multi', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'none' });
    store.setChecked('a', true);
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });

  it('is a no-op for unknown id', () => {
    const store = new TreeStore({ data: [], selection: 'multi' });
    expect(() => store.setChecked('ghost', true)).not.toThrow();
  });

  it('is a no-op for a disabled node', () => {
    const store = new TreeStore({ data: [disabledLeaf('a')], selection: 'multi' });
    store.setChecked('a', true);
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });

  it('checking a leaf sets row.checked to checked', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    store.setChecked('a', true);
    expect(store.rows()[0]?.checked).toBe('checked');
  });

  it('unchecking a leaf sets row.checked to unchecked', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    store.setChecked('a', true);
    store.setChecked('a', false);
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });
});

describe('multi-mode: cascade down', () => {
  it('checking a parent cascades to all enabled descendants', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('p', true);
    const rows = store.rows();
    expect(rows[0]?.checked).toBe('checked'); // p
    expect(rows[1]?.checked).toBe('checked'); // c1
    expect(rows[2]?.checked).toBe('checked'); // c2
  });

  it('unchecking a parent cascades to all enabled descendants', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('p', true);
    store.setChecked('p', false);
    const rows = store.rows();
    expect(rows[0]?.checked).toBe('unchecked');
    expect(rows[1]?.checked).toBe('unchecked');
    expect(rows[2]?.checked).toBe('unchecked');
  });

  it('cascade stops at disabled children (disabled node not toggled, subtree preserved)', () => {
    // p
    //   disabled-b (disabled)
    //     c (enabled)
    //   d (enabled)
    const store = new TreeStore({
      data: [branch('p', [disabledBranch('b', [leaf('c')]), leaf('d')])],
      selection: 'multi',
    });
    store.setChecked('p', true);
    expect(store.getNode('b')?.disabled).toBe(true);
    // b is disabled — not cascaded to
    expect(store.rows().find(r => r.node.id === 'b')?.checked ?? 'unchecked').toBe('unchecked');
    // c is under a disabled node — cascade stopped at b, c unchanged
    // d is enabled and should be checked
    store.expand('p');
    store.expand('b');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'b')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'c')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'd')?.checked).toBe('checked');
  });

  it('cascade works across three levels', () => {
    const store = new TreeStore({
      data: [branch('l1', [branch('l2', [leaf('l3a'), leaf('l3b')])])],
      selection: 'multi',
    });
    store.setChecked('l1', true);
    expect(store.getNode('l1')?.id).toBe('l1');
    store.expand('l1');
    store.expand('l2');
    const rows = store.rows();
    for (const row of rows) {
      expect(row.checked).toBe('checked');
    }
  });

  it('cascade: false — only the node itself changes', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
      cascade: false,
    });
    store.expand('p');
    store.setChecked('p', true);
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('unchecked');
  });
});

// ---------------------------------------------------------------------------
// §3.3 — indeterminate / ancestor-path-local recomputation
// ---------------------------------------------------------------------------

describe('multi-mode: indeterminate + ancestor recomputation', () => {
  it('checking one child makes parent indeterminate', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('c1', true);
    expect(store.rows().find(r => r.node.id === 'p')?.checked).toBe('indeterminate');
  });

  it('checking all children makes parent checked', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('c1', true);
    store.setChecked('c2', true);
    expect(store.rows().find(r => r.node.id === 'p')?.checked).toBe('checked');
  });

  it('unchecking one child of a fully-checked parent makes it indeterminate', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('p', true);
    store.setChecked('c1', false);
    expect(store.rows().find(r => r.node.id === 'p')?.checked).toBe('indeterminate');
  });

  it('propagates indeterminate up multiple levels', () => {
    // gp → p → c1, c2
    const store = new TreeStore({
      data: [branch('gp', [branch('p', [leaf('c1'), leaf('c2')])])],
      selection: 'multi',
    });
    store.setChecked('c1', true);
    store.expand('gp');
    store.expand('p');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('indeterminate');
    expect(rows.find(r => r.node.id === 'gp')?.checked).toBe('indeterminate');
  });

  it('checking all leaves in a subtree promotes ancestors to checked', () => {
    const store = new TreeStore({
      data: [branch('gp', [branch('p', [leaf('c1'), leaf('c2')])])],
      selection: 'multi',
    });
    store.setChecked('c1', true);
    store.setChecked('c2', true);
    store.expand('gp');
    store.expand('p');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'gp')?.checked).toBe('checked');
  });

  it('disabled child excluded from ancestor state count', () => {
    // p has c1 (enabled, unchecked) and c2 (disabled, unchecked)
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), disabledLeaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('c1', true);
    // Enabled children of p: only c1. c1 is checked → p should be checked (all enabled = checked)
    expect(store.rows().find(r => r.node.id === 'p')?.checked).toBe('checked');
  });

  it('parent with all-disabled children keeps its current state after cascade', () => {
    // p has only disabled children; ancestor recomputation should not change p's state
    const store = new TreeStore({
      data: [branch('p', [disabledLeaf('d1'), disabledLeaf('d2')])],
      selection: 'multi',
    });
    store.expand('p');
    // p starts unchecked; explicitly check p; cascade skips d1, d2 (disabled)
    store.setChecked('p', true);
    expect(store.rows().find(r => r.node.id === 'p')?.checked).toBe('checked');
    // d1, d2 remain unchecked
    expect(store.rows().find(r => r.node.id === 'd1')?.checked).toBe('unchecked');
    expect(store.rows().find(r => r.node.id === 'd2')?.checked).toBe('unchecked');
  });

  it('grandparent state unchanged when all its direct children are disabled (enabledChildren guard)', () => {
    // gp → dp (disabled branch) → c (enabled leaf)
    // Directly setChecked('c') — c itself is not disabled so it proceeds.
    // Ancestor walk: dp becomes 'checked' (only enabled child is c), then gp is recomputed:
    //   gp's enabledChildren = [] (dp is disabled) → keep gp's current 'unchecked' state.
    const store = new TreeStore({
      data: [{ id: 'gp', label: 'gp', children: [{ id: 'dp', label: 'dp', disabled: true, children: [leaf('c')] }] }],
      selection: 'multi',
    });
    store.setChecked('c', true);
    store.expand('gp');
    store.expand('dp');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'c')?.checked).toBe('checked');
    // gp has only disabled children → keep unchecked
    expect(rows.find(r => r.node.id === 'gp')?.checked).toBe('unchecked');
  });

  it('recomputation is ancestor-path-local: sibling subtrees not rescanned', () => {
    // two separate subtrees at the root; checking a leaf in one does not touch the other
    const store = new TreeStore({
      data: [
        branch('a', [leaf('a1'), leaf('a2')]),
        branch('b', [leaf('b1'), leaf('b2')]),
      ],
      selection: 'multi',
    });
    store.expand('a');
    store.expand('b');
    // Check a1 — should only affect a, not b
    store.setChecked('a1', true);
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'a')?.checked).toBe('indeterminate');
    expect(rows.find(r => r.node.id === 'b')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'b1')?.checked).toBe('unchecked');
  });
});

// ---------------------------------------------------------------------------
// §3.3 — toggleChecked
// ---------------------------------------------------------------------------

describe('multi-mode: toggleChecked', () => {
  it('unchecked → checked', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    store.toggleChecked('a');
    expect(store.rows()[0]?.checked).toBe('checked');
  });

  it('checked → unchecked', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    store.setChecked('a', true);
    store.toggleChecked('a');
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });

  it('indeterminate → checked (cascade fills in descendants)', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setChecked('c1', true); // p → indeterminate
    store.toggleChecked('p');     // indeterminate → check (state !== 'checked')
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('checked');
  });

  it('is a no-op for non-multi mode', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(() => store.toggleChecked('a')).not.toThrow();
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });
});

// ---------------------------------------------------------------------------
// §3.3 — setAllChecked
// ---------------------------------------------------------------------------

describe('multi-mode: setAllChecked', () => {
  it('setAllChecked(true) marks all nodes as checked', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setAllChecked(true);
    for (const row of store.rows()) {
      expect(row.checked).toBe('checked');
    }
  });

  it('setAllChecked(false) marks all nodes as unchecked', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setAllChecked(true);
    store.setAllChecked(false);
    for (const row of store.rows()) {
      expect(row.checked).toBe('unchecked');
    }
  });

  it('setAllChecked does not toggle disabled nodes', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), disabledLeaf('c2')])],
      selection: 'multi',
    });
    store.expand('p');
    store.setAllChecked(true);
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('unchecked'); // disabled
  });

  it('is a no-op when selection mode is not multi', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'none' });
    store.setAllChecked(true);
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });

  it('does not emit when nothing changes', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    store.setAllChecked(false); // already all unchecked
    const listener = vi.fn();
    store.subscribe(listener);
    store.setAllChecked(false);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// §3.3 — getChecked (topmost fully-checked nodes)
// ---------------------------------------------------------------------------

describe('multi-mode: getChecked()', () => {
  it('returns [] when no nodes are checked', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')], selection: 'multi' });
    expect(store.getChecked()).toEqual([]);
  });

  it('returns [] for non-multi mode', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(store.getChecked()).toEqual([]);
  });

  it('returns the topmost fully-checked nodes (not their checked children)', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.setChecked('p', true); // cascades to c1, c2 → p becomes checked
    const checked = store.getChecked();
    expect(checked.map(n => n.id)).toEqual(['p']);
  });

  it('returns individual checked children when parent is not fully checked', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.setChecked('c1', true); // p → indeterminate
    const checked = store.getChecked();
    expect(checked.map(n => n.id)).toEqual(['c1']);
  });

  it('returns root-level checked node without recursing into its descendants', () => {
    const store = new TreeStore({
      data: [
        branch('a', [leaf('a1'), leaf('a2')]),
        branch('b', [leaf('b1')]),
      ],
      selection: 'multi',
    });
    store.setChecked('a', true); // cascades a1, a2
    store.setChecked('b1', true); // b → checked (only enabled child)
    const checked = store.getChecked().map(n => n.id).sort();
    expect(checked).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// §3.3 — getCheckedLeaves
// ---------------------------------------------------------------------------

describe('multi-mode: getCheckedLeaves()', () => {
  it('returns [] when nothing is checked', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    expect(store.getCheckedLeaves()).toEqual([]);
  });

  it('returns [] for non-multi mode', () => {
    const store = new TreeStore({ data: [leaf('a')] });
    expect(store.getCheckedLeaves()).toEqual([]);
  });

  it('returns only leaf nodes that are checked', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.setChecked('c1', true); // p stays indeterminate, c1 checked
    const leaves = store.getCheckedLeaves().map(n => n.id);
    expect(leaves).toEqual(['c1']);
  });

  it('does not return a branch node even if fully checked', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    store.setChecked('p', true); // p, c1, c2 all checked
    const leaves = store.getCheckedLeaves().map(n => n.id).sort();
    expect(leaves).toContain('c1');
    expect(leaves).toContain('c2');
    expect(leaves).not.toContain('p');
  });

  it('a lazy node (hasChildren:true) is not a leaf', () => {
    const store = new TreeStore({
      data: [lazyBranch('lazy'), leaf('real-leaf')],
      selection: 'multi',
    });
    // setChecked on lazy node — manually test that lazy node excluded from getCheckedLeaves
    store.setChecked('real-leaf', true);
    const leaves = store.getCheckedLeaves().map(n => n.id);
    expect(leaves).toContain('real-leaf');
    expect(leaves).not.toContain('lazy');
  });
});

// ---------------------------------------------------------------------------
// §3.3 — single mode: select()
// ---------------------------------------------------------------------------

describe('single mode: select()', () => {
  it('is a no-op for non-single mode', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'none' });
    store.select('a');
    expect(store.rows()[0]?.selected).toBe(false);
  });

  it('is a no-op for unknown id', () => {
    const store = new TreeStore({ data: [], selection: 'single' });
    expect(() => store.select('ghost')).not.toThrow();
  });

  it('select() sets row.selected to true for the node', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'single' });
    store.select('a');
    expect(store.rows()[0]?.selected).toBe(true);
  });

  it('select() also sets checked state on the node', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'single' });
    store.select('a');
    expect(store.rows()[0]?.checked).toBe('checked');
  });

  it('selecting a new node clears the previous selection', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')], selection: 'single' });
    store.select('a');
    store.select('b');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'a')?.selected).toBe(false);
    expect(rows.find(r => r.node.id === 'a')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'b')?.selected).toBe(true);
    expect(rows.find(r => r.node.id === 'b')?.checked).toBe('checked');
  });

  it('selection persists across multiple rows() calls', () => {
    // Use a branch store so expand() actually invalidates the cache
    const store2 = new TreeStore({
      data: [branch('p', [leaf('c')]), leaf('b')],
      selection: 'single',
    });
    store2.select('b');
    store2.expand('p'); // invalidates cache
    const r2 = store2.rows();
    expect(r2.find(r => r.node.id === 'b')?.selected).toBe(true);
  });

  it('getSelected() returns the selected node', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')], selection: 'single' });
    store.select('a');
    expect(store.getSelected()?.id).toBe('a');
  });

  it('getSelected() returns null when nothing selected', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'single' });
    expect(store.getSelected()).toBeNull();
  });

  it('getSelected() returns null for non-single mode', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'none' });
    expect(store.getSelected()).toBeNull();
  });

  it('getSelected() updates when selection changes', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')], selection: 'single' });
    store.select('a');
    expect(store.getSelected()?.id).toBe('a');
    store.select('b');
    expect(store.getSelected()?.id).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// §3.3 — initialChecked
// ---------------------------------------------------------------------------

describe('initialChecked option', () => {
  it('pre-checks specified ids at construction', () => {
    const store = new TreeStore({
      data: [leaf('a'), leaf('b'), leaf('c')],
      selection: 'multi',
      initialChecked: ['a', 'c'],
    });
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'a')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'b')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'c')?.checked).toBe('checked');
  });

  it('silently ignores unknown ids', () => {
    expect(() => new TreeStore({
      data: [],
      selection: 'multi',
      initialChecked: ['ghost'],
    })).not.toThrow();
  });

  it('silently ignores disabled nodes in initialChecked', () => {
    const store = new TreeStore({
      data: [disabledLeaf('d')],
      selection: 'multi',
      initialChecked: ['d'],
    });
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });

  it('cascades down when initialChecked contains a parent', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
      initialChecked: ['p'],
    });
    store.expand('p');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('checked');
  });

  it('sets ancestor to indeterminate when only one child listed', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
      initialChecked: ['c1'],
    });
    store.expand('p');
    expect(store.rows().find(r => r.node.id === 'p')?.checked).toBe('indeterminate');
  });

  it('is ignored in non-multi mode', () => {
    const store = new TreeStore({
      data: [leaf('a')],
      selection: 'none',
      initialChecked: ['a'],
    });
    expect(store.rows()[0]?.checked).toBe('unchecked');
  });
});

// ---------------------------------------------------------------------------
// §3.3 — events: 'checked' and 'selected'
// ---------------------------------------------------------------------------

describe('selection events', () => {
  it('setChecked emits { type: checked, ids } with the node id', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.setChecked('a', true);
    const checkedEvt = events.find(e => e.type === 'checked') as { type: 'checked'; ids: string[] };
    expect(checkedEvt).toBeDefined();
    expect(checkedEvt.ids).toContain('a');
  });

  it('setChecked also emits { type: rows }', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'multi' });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.setChecked('a', true);
    expect(events.some(e => e.type === 'rows')).toBe(true);
  });

  it('cascade includes descendant ids in the checked event', () => {
    const store = new TreeStore({
      data: [branch('p', [leaf('c1'), leaf('c2')])],
      selection: 'multi',
    });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.setChecked('p', true);
    const checkedEvt = events.find(e => e.type === 'checked') as { type: 'checked'; ids: string[] };
    expect(checkedEvt.ids).toContain('p');
    expect(checkedEvt.ids).toContain('c1');
    expect(checkedEvt.ids).toContain('c2');
  });

  it('ancestor state change is included in checked event ids', () => {
    const store = new TreeStore({
      data: [branch('gp', [branch('p', [leaf('c')])])],
      selection: 'multi',
    });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.setChecked('c', true);
    const checkedEvt = events.find(e => e.type === 'checked') as { type: 'checked'; ids: string[] };
    expect(checkedEvt.ids).toContain('c');
    expect(checkedEvt.ids).toContain('p');
    expect(checkedEvt.ids).toContain('gp');
  });

  it('setAllChecked emits { type: checked } with changed ids', () => {
    const store = new TreeStore({ data: [leaf('a'), leaf('b')], selection: 'multi' });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.setAllChecked(true);
    const checkedEvt = events.find(e => e.type === 'checked') as { type: 'checked'; ids: string[] };
    expect(checkedEvt).toBeDefined();
    expect(checkedEvt.ids).toContain('a');
    expect(checkedEvt.ids).toContain('b');
  });

  it('select() emits { type: selected, id }', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'single' });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.select('a');
    const selEvt = events.find(e => e.type === 'selected') as { type: 'selected'; id: string | null };
    expect(selEvt).toBeDefined();
    expect(selEvt.id).toBe('a');
  });

  it('select() also emits { type: rows }', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'single' });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));
    store.select('a');
    expect(events.some(e => e.type === 'rows')).toBe(true);
  });

  it('setChecked no-op (disabled node) does NOT emit', () => {
    const store = new TreeStore({ data: [disabledLeaf('a')], selection: 'multi' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setChecked('a', true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('setChecked no-op (non-multi mode) does NOT emit', () => {
    const store = new TreeStore({ data: [leaf('a')], selection: 'none' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setChecked('a', true);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// §3.3 — lazy loading
// ---------------------------------------------------------------------------

// Helper: create a deferred promise for fine-grained async control.
function defer<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Helper: flush all timers and pending microtasks (vitest 3 fake timers).
async function flush() {
  await vi.runAllTimersAsync();
}

describe('lazy loading — §3.3', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // ---- basic load cycle ----

  it('expand triggers loadChildren once; loading:true during, children appear after resolve', async () => {
    const d = defer<TreeNodeData[]>();
    const loadChildren = vi.fn(() => d.promise);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });

    store.expand('p');

    // Synchronously: loading has started, not yet expanded
    expect(store.rows()[0]?.loading).toBe(true);
    expect(store.rows()[0]?.expanded).toBe(false);
    expect(store.rows()[0]?.loadError).toBeNull();
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(loadChildren).toHaveBeenCalledWith(expect.objectContaining({ id: 'p' }));

    d.resolve([leaf('c1'), leaf('c2')]);
    await flush();

    // After resolve: loading clears, node expands, children visible
    const rows = store.rows();
    expect(rows[0]?.loading).toBe(false);
    expect(rows[0]?.expanded).toBe(true);
    expect(rows[0]?.loadError).toBeNull();
    expect(rows).toHaveLength(3); // p, c1, c2
    expect(rows[1]?.node.id).toBe('c1');
    expect(rows[2]?.node.id).toBe('c2');
    expect(store.getNode('c1')).toBeDefined();
    expect(store.getNode('c2')).toBeDefined();
  });

  it('load emits load:start then load:success events (and rows events)', async () => {
    const d = defer<TreeNodeData[]>();
    const loadChildren = vi.fn(() => d.promise);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });

    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));

    store.expand('p');
    expect(events).toContainEqual({ type: 'load', id: 'p', status: 'start' });
    expect(events).toContainEqual({ type: 'rows' });

    const eventCountBeforeResolve = events.length;
    d.resolve([leaf('c1')]);
    await flush();

    expect(events).toContainEqual({ type: 'load', id: 'p', status: 'success' });
    expect(events.filter(e => e.type === 'rows').length).toBeGreaterThan(
      events.slice(0, eventCountBeforeResolve).filter(e => e.type === 'rows').length,
    );
  });

  // ---- out-of-order resolutions ----

  it('out-of-order resolutions: each node gets its own children correctly', async () => {
    const d1 = defer<TreeNodeData[]>();
    const d2 = defer<TreeNodeData[]>();
    const loadChildren = vi.fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    const store = new TreeStore({ data: [lazyBranch('a'), lazyBranch('b')], loadChildren });

    store.expand('a');
    store.expand('b');

    // Resolve b first
    d2.resolve([leaf('b1'), leaf('b2')]);
    await flush();

    expect(store.getNode('b1')).toBeDefined();
    expect(store.getNode('b2')).toBeDefined();
    expect(store.getNode('a1')).toBeUndefined(); // not yet loaded

    // Now resolve a
    d1.resolve([leaf('a1'), leaf('a2')]);
    await flush();

    expect(store.getNode('a1')).toBeDefined();
    expect(store.getNode('a2')).toBeDefined();

    // Verify each parent expanded and has the right children
    store.collapse('b');
    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'a')?.expanded).toBe(true);
    expect(rows.find(r => r.node.id === 'b')?.expanded).toBe(false);
    expect(rows.find(r => r.node.id === 'a1')).toBeDefined();
    expect(rows.find(r => r.node.id === 'b1')).toBeUndefined(); // b is collapsed
  });

  // ---- error + retry ----

  it('rejection sets loadError; retryLoad re-attempts and succeeds', async () => {
    const error = new Error('network error');
    const d1 = defer<TreeNodeData[]>();
    const d2 = defer<TreeNodeData[]>();
    const loadChildren = vi.fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));

    store.expand('p');
    d1.reject(error);
    await flush();

    // After failure
    expect(store.rows()[0]?.loadError).toBe(error);
    expect(store.rows()[0]?.loading).toBe(false);
    expect(store.rows()[0]?.expanded).toBe(false);
    expect(events).toContainEqual({ type: 'load', id: 'p', status: 'error' });

    // Retry
    const eventsBeforeRetry = events.length;
    store.retryLoad('p');
    expect(store.rows()[0]?.loading).toBe(true);
    expect(store.rows()[0]?.loadError).toBeNull();

    d2.resolve([leaf('c1')]);
    await flush();

    expect(store.rows()[0]?.loadError).toBeNull();
    expect(store.rows()[0]?.loading).toBe(false);
    expect(store.rows()[0]?.expanded).toBe(true);
    expect(store.rows()).toHaveLength(2);
    expect(events.slice(eventsBeforeRetry)).toContainEqual({ type: 'load', id: 'p', status: 'start' });
    expect(events.slice(eventsBeforeRetry)).toContainEqual({ type: 'load', id: 'p', status: 'success' });
  });

  it('loadError is an Error object even when rejection value is a string', async () => {
    const d = defer<TreeNodeData[]>();
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren: () => d.promise });
    store.expand('p');
    d.reject('raw string error');
    await flush();

    const err = store.rows()[0]?.loadError;
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe('raw string error');
  });

  it('load emits load:error event', async () => {
    const d = defer<TreeNodeData[]>();
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren: () => d.promise });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));

    store.expand('p');
    d.reject(new Error('fail'));
    await flush();

    expect(events).toContainEqual({ type: 'load', id: 'p', status: 'error' });
  });

  it('retryLoad is a no-op when there is no error', async () => {
    const loadChildren = vi.fn().mockResolvedValue([leaf('c1')]);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });

    store.expand('p');
    await flush();

    const callCount = loadChildren.mock.calls.length;
    store.retryLoad('p'); // no error exists
    await flush();
    expect(loadChildren.mock.calls.length).toBe(callCount);
  });

  it('retryLoad is a no-op when loadChildren is not configured', () => {
    const store = new TreeStore({ data: [lazyBranch('p')] });
    expect(() => store.retryLoad('p')).not.toThrow();
  });

  it('retryLoad is a no-op for unknown id', () => {
    const loadChildren = vi.fn();
    const store = new TreeStore({ data: [], loadChildren });
    expect(() => store.retryLoad('ghost')).not.toThrow();
    expect(loadChildren).not.toHaveBeenCalled();
  });

  // ---- loadOnce ----

  it('loadOnce:true (default) — children cached; loadChildren called only once across expand/collapse/expand', async () => {
    const loadChildren = vi.fn().mockResolvedValue([leaf('c1')]);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren, loadOnce: true });

    store.expand('p');
    await flush();
    expect(loadChildren).toHaveBeenCalledOnce();

    store.collapse('p');
    store.expand('p'); // should NOT call loadChildren again

    expect(loadChildren).toHaveBeenCalledOnce(); // still only once
    expect(store.rows()[0]?.expanded).toBe(true); // expanded immediately from cache
    expect(store.rows()[0]?.loading).toBe(false);
  });

  it('loadOnce:false — reload triggered on each expand after collapse', async () => {
    const d1 = defer<TreeNodeData[]>();
    const d2 = defer<TreeNodeData[]>();
    const loadChildren = vi.fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren, loadOnce: false });

    store.expand('p');
    d1.resolve([leaf('c1')]);
    await flush();
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(store.rows()).toHaveLength(2); // p, c1

    store.collapse('p');
    store.expand('p'); // loadOnce:false → re-loads
    expect(loadChildren).toHaveBeenCalledTimes(2);
    expect(store.rows()[0]?.loading).toBe(true);

    d2.resolve([leaf('c1-new'), leaf('c2-new')]);
    await flush();

    expect(store.rows()).toHaveLength(3); // p, c1-new, c2-new
    expect(store.getNode('c1-new')).toBeDefined();
    expect(store.getNode('c1')).toBeUndefined(); // old child replaced
  });

  // ---- concurrent-expand guard ----

  it('concurrent-expand: second expand while loading is a no-op', async () => {
    const d = defer<TreeNodeData[]>();
    const loadChildren = vi.fn(() => d.promise);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });

    store.expand('p'); // starts load
    store.expand('p'); // no-op: concurrent guard
    store.expand('p'); // no-op again

    expect(loadChildren).toHaveBeenCalledOnce();

    d.resolve([leaf('c1')]);
    await flush();

    expect(store.rows()).toHaveLength(2); // p, c1 — only one load happened
  });

  // ---- staleness token ----

  it('staleness: resolution arriving after setData() is discarded', async () => {
    const d = defer<TreeNodeData[]>();
    const loadChildren = vi.fn(() => d.promise);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));

    store.expand('p');
    expect(store.rows()[0]?.loading).toBe(true);

    // Replace the tree while the load is still in flight
    store.setData([leaf('new-root')]);
    expect(store.getNode('p')).toBeUndefined();
    expect(store.getNode('new-root')).toBeDefined();

    // Resolve the stale load
    d.resolve([leaf('stale-child')]);
    await flush();

    // Stale result discarded: stale-child never inserted, new-root unaffected
    expect(store.getNode('stale-child')).toBeUndefined();
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]?.node.id).toBe('new-root');
    // No load:success event should have been emitted after setData
    const successEvents = events.filter(e => e.type === 'load' && e.status === 'success');
    expect(successEvents).toHaveLength(0);
  });

  it('staleness: second setData() with two in-flight loads discards both', async () => {
    const d1 = defer<TreeNodeData[]>();
    const d2 = defer<TreeNodeData[]>();
    const loadChildren = vi.fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    const store = new TreeStore({ data: [lazyBranch('a'), lazyBranch('b')], loadChildren });

    store.expand('a');
    store.expand('b');

    store.setData([leaf('fresh')]);

    d1.resolve([leaf('a1')]);
    d2.resolve([leaf('b1')]);
    await flush();

    expect(store.getNode('a1')).toBeUndefined();
    expect(store.getNode('b1')).toBeUndefined();
    expect(store.rows()).toHaveLength(1);
    expect(store.rows()[0]?.node.id).toBe('fresh');
  });

  // ---- collapse during load ----

  it('collapse-during-load: auto-expand cancelled, children still loaded', async () => {
    const d = defer<TreeNodeData[]>();
    const loadChildren = vi.fn(() => d.promise);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });
    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));

    store.expand('p');
    expect(store.rows()[0]?.loading).toBe(true);

    store.collapse('p'); // cancel auto-expand; in-flight load continues

    d.resolve([leaf('c1'), leaf('c2')]);
    await flush();

    // Children loaded but node remains collapsed
    expect(store.getNode('c1')).toBeDefined();
    expect(store.getNode('c2')).toBeDefined();
    expect(store.rows()[0]?.loading).toBe(false);
    expect(store.rows()[0]?.expanded).toBe(false);
    expect(store.rows()).toHaveLength(1); // only 'p' visible, not children

    // load:success is still emitted (children were loaded)
    expect(events).toContainEqual({ type: 'load', id: 'p', status: 'success' });

    // User can manually expand now (children already loaded → loadOnce:true skips reload)
    store.expand('p');
    expect(store.rows()).toHaveLength(3);
    expect(store.rows()[0]?.expanded).toBe(true);
  });

  it('collapse-during-load does NOT emit an extra rows event from the collapse itself', () => {
    const d = defer<TreeNodeData[]>();
    const loadChildren = vi.fn(() => d.promise);
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren });

    store.expand('p'); // starts load, emits rows
    const listener = vi.fn();
    store.subscribe(listener);

    store.collapse('p'); // wasPendingExpand only, not in _expanded → no rows emit
    expect(listener).not.toHaveBeenCalled();
  });

  // ---- selection cascade on load ----

  it('checked parent: newly loaded children become checked', async () => {
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: vi.fn().mockResolvedValue([leaf('c1'), leaf('c2')]),
      selection: 'multi',
    });

    store.setChecked('p', true);
    expect(store.rows()[0]?.checked).toBe('checked');

    store.expand('p');
    await flush();

    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
  });

  it('unchecked parent: newly loaded children stay unchecked', async () => {
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: vi.fn().mockResolvedValue([leaf('c1'), leaf('c2')]),
      selection: 'multi',
    });

    store.expand('p');
    await flush();

    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('unchecked');
  });

  it('parent indeterminate recomputed after children load', async () => {
    // gp → p (lazy). gp has another child gc (checked). gp is indeterminate.
    // Load p's children. p's children are unchecked → p stays unchecked.
    // gp recomputed: gc(checked) + p(unchecked) → gp stays indeterminate.
    const store = new TreeStore({
      data: [
        branch('gp', [
          lazyBranch('p'),
          leaf('gc'),
        ]),
      ],
      loadChildren: vi.fn().mockResolvedValue([leaf('pc1'), leaf('pc2')]),
      selection: 'multi',
    });

    store.setChecked('gc', true); // gp → indeterminate
    store.expand('gp');
    store.expand('p');
    await flush();

    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'gc')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'pc1')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'gp')?.checked).toBe('indeterminate');
  });

  it('checked parent + disabled child: cascade skips disabled; parent remains checked', async () => {
    const disabledChild: TreeNodeData = { id: 'c-disabled', label: 'c-disabled', disabled: true };
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: vi.fn().mockResolvedValue([leaf('c1'), disabledChild]),
      selection: 'multi',
    });

    store.setChecked('p', true);
    store.expand('p');
    await flush();

    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c-disabled')?.checked).toBe('unchecked');
    // Only enabled child (c1) counts → parent checked
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
  });

  it('cascade emits checked event for newly checked children', async () => {
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: vi.fn().mockResolvedValue([leaf('c1'), leaf('c2')]),
      selection: 'multi',
    });
    store.setChecked('p', true);

    const events: TreeChangeEvent[] = [];
    store.subscribe(e => events.push(e));

    store.expand('p');
    await flush();

    const checkedEvt = events.find(e => e.type === 'checked') as { type: 'checked'; ids: string[] } | undefined;
    expect(checkedEvt).toBeDefined();
    expect(checkedEvt?.ids).toContain('c1');
    expect(checkedEvt?.ids).toContain('c2');
  });

  it('cascade: false — children stay unchecked even when parent is checked', async () => {
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: vi.fn().mockResolvedValue([leaf('c1'), leaf('c2')]),
      selection: 'multi',
      cascade: false,
    });

    store.setChecked('p', true);
    store.expand('p');
    await flush();

    const rows = store.rows();
    expect(rows.find(r => r.node.id === 'p')?.checked).toBe('checked');
    expect(rows.find(r => r.node.id === 'c1')?.checked).toBe('unchecked');
    expect(rows.find(r => r.node.id === 'c2')?.checked).toBe('unchecked');
  });

  // ---- lazy node without loadChildren configured ----

  it('lazy node without loadChildren configured: expand is a regular no-op (stays expandable, no load)', () => {
    const store = new TreeStore({ data: [lazyBranch('p')] });
    store.expand('p');

    const row = store.rows()[0]!;
    expect(row.expanded).toBe(true); // treated as a regular expand
    expect(row.loading).toBe(false);
    expect(row.loadError).toBeNull();
  });

  // ---- rows() correctness during/after load ----

  it('rows() shows loading:true and loadError:null during load', async () => {
    const d = defer<TreeNodeData[]>();
    const store = new TreeStore({ data: [lazyBranch('p')], loadChildren: () => d.promise });

    store.expand('p');
    expect(store.rows()[0]?.loading).toBe(true);
    expect(store.rows()[0]?.loadError).toBeNull();
    expect(store.rows()[0]?.expanded).toBe(false);

    d.resolve([]);
    await flush();
  });

  it('rows() shows loadError and loading:false after rejection', async () => {
    const err = new Error('fail');
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: () => Promise.reject(err),
    });
    store.expand('p');
    await flush();

    expect(store.rows()[0]?.loading).toBe(false);
    expect(store.rows()[0]?.loadError).toBe(err);
    expect(store.rows()[0]?.expanded).toBe(false);
  });

  it('expandable remains true for a lazy node after loading its children', async () => {
    const store = new TreeStore({
      data: [lazyBranch('p')],
      loadChildren: vi.fn().mockResolvedValue([leaf('c1')]),
    });
    store.expand('p');
    await flush();

    // hasChildren:true on data means always expandable
    expect(store.rows()[0]?.expandable).toBe(true);
  });
});
