import type {
  CheckedState,
  Row,
  SelectionMode,
  TreeChangeEvent,
  TreeNodeData,
  TreeStoreOptions,
} from './types.js';

interface InternalNode<T> {
  data: TreeNodeData<T>;
  children: InternalNode<T>[];
  parentId: string | null;
}

export class TreeStore<T = unknown> {
  // ---- internal tree structure ----
  private _nodeMap = new Map<string, InternalNode<T>>();
  private _roots: InternalNode<T>[] = [];

  // ---- view state ----
  private _expanded = new Set<string>();
  private _rowsCache: Row<T>[] | null = null;
  private _listeners = new Set<(e: TreeChangeEvent) => void>();

  // ---- stub state: selection (implemented by core-selection task) ----
  private _selection: SelectionMode;
  private _cascade: boolean;
  private _checkedSet = new Set<string>();
  private _selectedId: string | null = null;

  // ---- stub state: lazy (implemented by core-lazy task) ----
  private _loadChildren: TreeStoreOptions<T>['loadChildren'];
  private _loadOnce: boolean;
  private _loadingSet = new Set<string>();
  private _loadErrors = new Map<string, Error>();

  // ---- stub state: filter (implemented by core-filter task) ----
  private _matcher: TreeStoreOptions<T>['matcher'];
  private _filterQuery = '';
  private _matchedSet = new Set<string>();

  constructor(options: TreeStoreOptions<T>) {
    this._selection = options.selection ?? 'none';
    this._cascade = options.cascade ?? true;
    this._loadChildren = options.loadChildren;
    this._loadOnce = options.loadOnce ?? true;
    this._matcher = options.matcher;

    this._loadData(options.data);

    if (options.initialExpanded) {
      for (const id of options.initialExpanded) {
        if (this._nodeMap.has(id)) {
          this._expanded.add(id);
        }
      }
    }
    // options.initialChecked: stub — core-selection task implements
  }

  // ================================================================
  // reads
  // ================================================================

  /** Cached flat projection of visible tree. Invalidated by any mutation. */
  rows(): Row<T>[] {
    if (this._rowsCache !== null) return this._rowsCache;
    const result: Row<T>[] = [];
    this._buildRows(this._roots, 1, result);
    this._rowsCache = result;
    return result;
  }

  getNode(id: string): TreeNodeData<T> | undefined {
    return this._nodeMap.get(id)?.data;
  }

  // stubs — implemented by core-selection task
  getChecked(): TreeNodeData<T>[] { return []; }
  getCheckedLeaves(): TreeNodeData<T>[] { return []; }
  getSelected(): TreeNodeData<T> | null { return null; }

  // ================================================================
  // commands: expansion
  // ================================================================

  expand(id: string): void {
    if (!this._nodeMap.has(id)) return;
    if (this._expanded.has(id)) return;
    this._expanded.add(id);
    this._invalidate();
    this._emit({ type: 'rows' });
  }

  collapse(id: string): void {
    if (!this._expanded.has(id)) return;
    this._expanded.delete(id);
    this._invalidate();
    this._emit({ type: 'rows' });
  }

  toggleExpanded(id: string): void {
    if (this._expanded.has(id)) {
      this.collapse(id);
    } else {
      this.expand(id);
    }
  }

  // ================================================================
  // commands: mutations
  // ================================================================

  setData(data: TreeNodeData<T>[]): void {
    this._expanded.clear();
    this._checkedSet.clear();
    this._selectedId = null;
    this._loadingSet.clear();
    this._loadErrors.clear();
    this._matchedSet.clear();
    this._filterQuery = '';
    this._loadData(data);
    this._emit({ type: 'rows' });
  }

  addNode(parentId: string | null, node: TreeNodeData<T>): void {
    // Validate incoming subtree for internal duplicates and conflicts with existing tree
    const incomingIds: string[] = [];
    this._collectAllIds(node, incomingIds);

    const incomingSet = new Set<string>();
    for (const id of incomingIds) {
      if (incomingSet.has(id) || this._nodeMap.has(id)) {
        throw new Error(`Duplicate node id: "${id}"`);
      }
      incomingSet.add(id);
    }

    const internal = this._buildInternal(node, parentId);
    this._registerInternal(internal);

    if (parentId === null) {
      this._roots.push(internal);
    } else {
      const parent = this._nodeMap.get(parentId);
      if (!parent) throw new Error(`Parent node not found: "${parentId}"`);
      parent.children.push(internal);
    }

    this._invalidate();
    this._emit({ type: 'rows' });
  }

  removeNode(id: string): void {
    const node = this._nodeMap.get(id);
    if (!node) return;

    if (node.parentId === null) {
      this._roots = this._roots.filter(n => n.data.id !== id);
    } else {
      const parent = this._nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter(n => n.data.id !== id);
      }
    }

    this._purgeInternal(node);
    this._invalidate();
    this._emit({ type: 'rows' });
  }

  updateNode(id: string, patch: Partial<Omit<TreeNodeData<T>, 'id'>>): void {
    const internal = this._nodeMap.get(id);
    if (!internal) return;
    internal.data = { ...internal.data, ...patch };
    this._invalidate();
    this._emit({ type: 'rows' });
  }

  // ================================================================
  // commands: selection stubs (core-selection task implements)
  // ================================================================

  setChecked(_id: string, _checked: boolean): void { /* stub */ }
  toggleChecked(_id: string): void { /* stub */ }
  select(_id: string): void { /* stub */ }
  setAllChecked(_checked: boolean): void { /* stub */ }

  // ================================================================
  // commands: filter stubs (core-filter task implements)
  // ================================================================

  setFilter(_query: string): void { /* stub */ }
  clearFilter(): void { /* stub */ }

  // ================================================================
  // commands: lazy stubs (core-lazy task implements)
  // ================================================================

  retryLoad(_id: string): void { /* stub */ }

  // ================================================================
  // reactivity
  // ================================================================

  subscribe(fn: (e: TreeChangeEvent) => void): () => void {
    this._listeners.add(fn);
    return () => { this._listeners.delete(fn); };
  }

  // ================================================================
  // private helpers
  // ================================================================

  private _buildRows(nodes: InternalNode<T>[], level: number, result: Row<T>[]): void {
    const setSize = nodes.length;
    for (const [i, node] of nodes.entries()) {
      const id = node.data.id;
      const expanded = this._expanded.has(id);
      const expandable =
        node.data.children !== undefined || node.data.hasChildren === true;

      result.push({
        node: node.data,
        level,
        setSize,
        posInSet: i + 1,
        expandable,
        expanded,
        checked: 'unchecked' as CheckedState,
        selected: false,
        loading: this._loadingSet.has(id),
        loadError: this._loadErrors.get(id) ?? null,
        matched: this._matchedSet.has(id),
      });

      if (expanded && node.children.length > 0) {
        this._buildRows(node.children, level + 1, result);
      }
    }
  }

  private _loadData(data: TreeNodeData<T>[]): void {
    this._validateUniqueIds(data);
    this._nodeMap.clear();
    this._roots = data.map(node => this._buildInternal(node, null));
    for (const root of this._roots) {
      this._registerInternal(root);
    }
    this._invalidate();
  }

  private _validateUniqueIds(nodes: TreeNodeData<T>[]): void {
    const seen = new Set<string>();
    const check = (node: TreeNodeData<T>): void => {
      if (seen.has(node.id)) {
        throw new Error(`Duplicate node id: "${node.id}"`);
      }
      seen.add(node.id);
      if (node.children) {
        for (const child of node.children) {
          check(child);
        }
      }
    };
    for (const node of nodes) {
      check(node);
    }
  }

  private _buildInternal(node: TreeNodeData<T>, parentId: string | null): InternalNode<T> {
    const children: InternalNode<T>[] = [];
    if (node.children !== undefined) {
      for (const child of node.children) {
        children.push(this._buildInternal(child, node.id));
      }
    }
    return { data: node, children, parentId };
  }

  private _registerInternal(node: InternalNode<T>): void {
    this._nodeMap.set(node.data.id, node);
    for (const child of node.children) {
      this._registerInternal(child);
    }
  }

  private _collectAllIds(node: TreeNodeData<T>, ids: string[]): void {
    ids.push(node.id);
    if (node.children) {
      for (const child of node.children) {
        this._collectAllIds(child, ids);
      }
    }
  }

  private _purgeInternal(node: InternalNode<T>): void {
    this._nodeMap.delete(node.data.id);
    this._expanded.delete(node.data.id);
    this._checkedSet.delete(node.data.id);
    this._loadingSet.delete(node.data.id);
    this._loadErrors.delete(node.data.id);
    this._matchedSet.delete(node.data.id);
    for (const child of node.children) {
      this._purgeInternal(child);
    }
  }

  private _invalidate(): void {
    this._rowsCache = null;
  }

  private _emit(event: TreeChangeEvent): void {
    for (const listener of this._listeners) {
      listener(event);
    }
  }

}
