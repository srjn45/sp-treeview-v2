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

// Incremented on every setData() call to detect stale async resolutions.
type Epoch = number;

export class TreeStore<T = unknown> {
  // ---- internal tree structure ----
  private _nodeMap = new Map<string, InternalNode<T>>();
  private _roots: InternalNode<T>[] = [];

  // ---- view state ----
  private _expanded = new Set<string>();
  private _rowsCache: Row<T>[] | null = null;
  private _listeners = new Set<(e: TreeChangeEvent) => void>();

  // ---- selection state ----
  private _selection: SelectionMode;
  private _cascade: boolean;
  private _checkedSet = new Set<string>();
  private _indeterminateSet = new Set<string>();
  private _selectedId: string | null = null;

  // ---- lazy loading state ----
  private _loadChildren: TreeStoreOptions<T>['loadChildren'];
  private _loadOnce: boolean;
  private _loadingSet = new Set<string>();
  private _loadErrors = new Map<string, Error>();
  private _loadedSet = new Set<string>();    // nodes whose children have been loaded at least once
  private _pendingExpand = new Set<string>(); // nodes to auto-expand when their load resolves
  private _storeEpoch: Epoch = 0;            // incremented by setData() to detect stale resolutions

  // ---- filter state ----
  private _matcher: TreeStoreOptions<T>['matcher'];
  private _filterQuery = '';
  private _matchedSet = new Set<string>();
  private _filterAncestorSet = new Set<string>();       // ancestors of matched nodes
  private _filterExpansionSnapshot: Set<string> | null = null; // _expanded at first setFilter

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
    if (options.initialChecked && this._selection === 'multi') {
      const dummy = new Set<string>();
      for (const id of options.initialChecked) {
        const node = this._nodeMap.get(id);
        if (!node || node.data.disabled) continue;
        this._applyState(id, 'checked', dummy);
        if (this._cascade) {
          this._cascadeDown(node, true, dummy);
          this._recomputeAncestors(id, dummy);
        }
      }
    }
  }

  // ================================================================
  // reads
  // ================================================================

  /** Cached flat projection of visible tree. Invalidated by any mutation. */
  rows(): Row<T>[] {
    if (this._rowsCache !== null) return this._rowsCache;
    const result: Row<T>[] = [];
    const visibleSet: Set<string> | null = this._filterQuery
      ? new Set<string>([...this._matchedSet, ...this._filterAncestorSet])
      : null;
    this._buildRows(this._roots, 1, result, visibleSet);
    this._rowsCache = result;
    return result;
  }

  getNode(id: string): TreeNodeData<T> | undefined {
    return this._nodeMap.get(id)?.data;
  }

  /** Multi mode: topmost fully-checked nodes (collapsed subtrees). */
  getChecked(): TreeNodeData<T>[] {
    if (this._selection !== 'multi') return [];
    const result: TreeNodeData<T>[] = [];
    this._collectTopChecked(this._roots, result);
    return result;
  }

  /** Multi mode: all checked leaf nodes. */
  getCheckedLeaves(): TreeNodeData<T>[] {
    if (this._selection !== 'multi') return [];
    const result: TreeNodeData<T>[] = [];
    for (const [id, node] of this._nodeMap) {
      if (this._checkedSet.has(id) && this._isLeaf(node)) {
        result.push(node.data);
      }
    }
    return result;
  }

  /** Single mode: the currently selected node or null. */
  getSelected(): TreeNodeData<T> | null {
    if (this._selection !== 'single' || this._selectedId === null) return null;
    return this._nodeMap.get(this._selectedId)?.data ?? null;
  }

  // ================================================================
  // commands: expansion
  // ================================================================

  expand(id: string): void {
    if (!this._nodeMap.has(id)) return;
    if (this._expanded.has(id)) return;

    const internal = this._nodeMap.get(id)!;
    const node = internal.data;

    // Lazy node with a loadChildren callback configured
    if (node.hasChildren === true && node.children === undefined && this._loadChildren) {
      const alreadyLoaded = this._loadedSet.has(id);

      if (alreadyLoaded && this._loadOnce) {
        // Children cached; expand immediately without re-loading
        this._expanded.add(id);
        this._invalidate();
        this._emit({ type: 'rows' });
        return;
      }

      // Concurrent-expand guard: no-op if a load is already in flight
      if (this._loadingSet.has(id)) return;

      // Mark intent to expand on load success, then trigger the load
      this._pendingExpand.add(id);
      this._triggerLoad(id);
      return;
    }

    // Non-lazy (or lazy with no loadChildren): regular expand
    this._expanded.add(id);
    this._invalidate();
    this._emit({ type: 'rows' });
  }

  collapse(id: string): void {
    const wasExpanded = this._expanded.has(id);
    const wasPendingExpand = this._pendingExpand.has(id);

    if (!wasExpanded && !wasPendingExpand) return;

    this._expanded.delete(id);
    // Cancel auto-expand intent (load stays in flight per spec)
    this._pendingExpand.delete(id);

    if (wasExpanded) {
      this._invalidate();
      this._emit({ type: 'rows' });
    }
    // If only wasPendingExpand: loading continues but no visible rows() change yet
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
    this._storeEpoch++;  // invalidate any in-flight loads
    this._expanded.clear();
    this._checkedSet.clear();
    this._indeterminateSet.clear();
    this._selectedId = null;
    this._loadingSet.clear();
    this._loadErrors.clear();
    this._loadedSet.clear();
    this._pendingExpand.clear();
    this._matchedSet.clear();
    this._filterQuery = '';
    this._filterAncestorSet.clear();
    this._filterExpansionSnapshot = null;
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
  // commands: selection
  // ================================================================

  setChecked(id: string, checked: boolean): void {
    if (this._selection !== 'multi') return;
    const node = this._nodeMap.get(id);
    if (!node || node.data.disabled) return;

    const changed = new Set<string>();
    this._applyState(id, checked ? 'checked' : 'unchecked', changed);

    if (this._cascade) {
      this._cascadeDown(node, checked, changed);
      this._recomputeAncestors(id, changed);
    }

    this._invalidate();
    this._emit({ type: 'checked', ids: [...changed] });
    this._emit({ type: 'rows' });
  }

  toggleChecked(id: string): void {
    if (this._selection !== 'multi') return;
    const state = this._getCheckedState(id);
    // checked → uncheck; unchecked or indeterminate → check
    this.setChecked(id, state !== 'checked');
  }

  select(id: string): void {
    if (this._selection !== 'single') return;
    const node = this._nodeMap.get(id);
    if (!node) return;

    // Clear prior selection's checked state
    if (this._selectedId !== null) {
      this._checkedSet.delete(this._selectedId);
    }

    this._selectedId = id;
    this._checkedSet.add(id);

    this._invalidate();
    this._emit({ type: 'selected', id });
    this._emit({ type: 'rows' });
  }

  /**
   * Check or uncheck all non-disabled nodes in multi mode.
   * Iterates the full node map directly — no cascade stop-at-disabled rule,
   * so every enabled node is set regardless of its parent's disabled status.
   */
  setAllChecked(checked: boolean): void {
    if (this._selection !== 'multi') return;

    const changed = new Set<string>();
    const target: CheckedState = checked ? 'checked' : 'unchecked';

    for (const [id, node] of this._nodeMap) {
      if (!node.data.disabled) {
        this._applyState(id, target, changed);
      }
    }

    this._invalidate();
    if (changed.size > 0) {
      this._emit({ type: 'checked', ids: [...changed] });
      this._emit({ type: 'rows' });
    }
  }

  // ================================================================
  // commands: filter
  // ================================================================

  setFilter(query: string): void {
    if (query === this._filterQuery) return;

    if (query) {
      // Take snapshot of expansion state on first filter activation
      if (this._filterExpansionSnapshot === null) {
        this._filterExpansionSnapshot = new Set(this._expanded);
      }
      this._filterQuery = query;
      this._reapplyFilter();
    } else {
      this._deactivateFilter();
    }

    this._invalidate();
    this._emit({ type: 'rows' });
  }

  clearFilter(): void {
    if (this._filterQuery === '' && this._filterExpansionSnapshot === null) return;
    this._deactivateFilter();
    this._invalidate();
    this._emit({ type: 'rows' });
  }

  // ================================================================
  // commands: lazy loading
  // ================================================================

  retryLoad(id: string): void {
    if (!this._loadChildren) return;
    if (!this._nodeMap.has(id)) return;
    if (!this._loadErrors.has(id)) return;   // only retry after a failure
    if (this._loadingSet.has(id)) return;    // guard against concurrent retry
    this._pendingExpand.add(id);             // auto-expand on success
    this._triggerLoad(id);
  }

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

  private _buildRows(
    nodes: InternalNode<T>[],
    level: number,
    result: Row<T>[],
    visibleSet: Set<string> | null,
  ): void {
    const visibleNodes = visibleSet
      ? nodes.filter(n => visibleSet.has(n.data.id))
      : nodes;
    const setSize = visibleNodes.length;

    for (const [i, node] of visibleNodes.entries()) {
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
        checked: this._getCheckedState(id),
        selected: this._selectedId === id,
        loading: this._loadingSet.has(id),
        loadError: this._loadErrors.get(id) ?? null,
        matched: this._matchedSet.has(id),
      });

      if (expanded && node.children.length > 0) {
        this._buildRows(node.children, level + 1, result, visibleSet);
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
    this._indeterminateSet.delete(node.data.id);
    this._loadingSet.delete(node.data.id);
    this._loadErrors.delete(node.data.id);
    this._loadedSet.delete(node.data.id);
    this._pendingExpand.delete(node.data.id);
    this._matchedSet.delete(node.data.id);
    this._filterAncestorSet.delete(node.data.id);
    for (const child of node.children) {
      this._purgeInternal(child);
    }
  }

  // ================================================================
  // private: selection helpers
  // ================================================================

  private _getCheckedState(id: string): CheckedState {
    if (this._checkedSet.has(id)) return 'checked';
    if (this._indeterminateSet.has(id)) return 'indeterminate';
    return 'unchecked';
  }

  /** Apply a CheckedState to a node, recording in `changed` only if state actually changed. */
  private _applyState(id: string, state: CheckedState, changed: Set<string>): void {
    const prev = this._getCheckedState(id);
    if (prev === state) return;
    if (state === 'checked') {
      this._checkedSet.add(id);
      this._indeterminateSet.delete(id);
    } else if (state === 'indeterminate') {
      this._indeterminateSet.add(id);
      this._checkedSet.delete(id);
    } else {
      this._checkedSet.delete(id);
      this._indeterminateSet.delete(id);
    }
    changed.add(id);
  }

  /**
   * Cascade checked/unchecked down to all non-disabled descendants.
   * Stops recursion at disabled children (their subtrees are left unchanged).
   */
  private _cascadeDown(node: InternalNode<T>, checked: boolean, changed: Set<string>): void {
    for (const child of node.children) {
      if (child.data.disabled) continue;
      this._applyState(child.data.id, checked ? 'checked' : 'unchecked', changed);
      this._cascadeDown(child, checked, changed);
    }
  }

  /**
   * Walk up from `id` to the root, recomputing each ancestor's CheckedState
   * from its direct enabled children only (ancestor-path-local; never rescans whole tree).
   */
  private _recomputeAncestors(id: string, changed: Set<string>): void {
    let currentId: string | null = id;
    while (currentId !== null) {
      const node = this._nodeMap.get(currentId);
      if (!node || node.parentId === null) break;
      const parent = this._nodeMap.get(node.parentId)!;
      const newState = this._computeStateFromChildren(parent);
      this._applyState(parent.data.id, newState, changed);
      currentId = parent.data.id;
    }
  }

  /**
   * Derive a parent's CheckedState from its direct enabled children.
   * Disabled children are excluded from the count per spec.
   * If no enabled children exist, keeps the parent's current state unchanged.
   */
  private _computeStateFromChildren(parent: InternalNode<T>): CheckedState {
    const enabledChildren = parent.children.filter(c => !c.data.disabled);
    if (enabledChildren.length === 0) {
      return this._getCheckedState(parent.data.id);
    }
    let checkedCount = 0;
    let indeterminateCount = 0;
    for (const child of enabledChildren) {
      const s = this._getCheckedState(child.data.id);
      if (s === 'checked') checkedCount++;
      else if (s === 'indeterminate') indeterminateCount++;
    }
    if (indeterminateCount > 0 || (checkedCount > 0 && checkedCount < enabledChildren.length)) {
      return 'indeterminate';
    }
    return checkedCount === enabledChildren.length ? 'checked' : 'unchecked';
  }

  /** Collect the topmost fully-checked nodes (don't recurse into checked subtrees). */
  private _collectTopChecked(nodes: InternalNode<T>[], result: TreeNodeData<T>[]): void {
    for (const node of nodes) {
      if (this._checkedSet.has(node.data.id)) {
        result.push(node.data);
      } else {
        this._collectTopChecked(node.children, result);
      }
    }
  }

  /** True for leaf nodes: no children key on the data and no lazy marker. */
  private _isLeaf(node: InternalNode<T>): boolean {
    return node.data.children === undefined && node.data.hasChildren !== true;
  }

  /**
   * Start a loadChildren async fetch for the given node id.
   * Guards (concurrent, staleness) must be checked before calling.
   */
  private _triggerLoad(id: string): void {
    if (!this._loadChildren) return;
    const internal = this._nodeMap.get(id);
    if (!internal) return;

    const epoch: Epoch = this._storeEpoch;

    this._loadingSet.add(id);
    this._loadErrors.delete(id);
    this._invalidate();
    this._emit({ type: 'load', id, status: 'start' });
    this._emit({ type: 'rows' });

    void this._loadChildren(internal.data).then(
      (children) => {
        // Staleness: setData() was called while this load was in flight — discard
        if (this._storeEpoch !== epoch) return;
        const node = this._nodeMap.get(id);
        if (!node) return;

        this._loadingSet.delete(id);
        this._loadedSet.add(id);

        // Replace any previously loaded children (covers loadOnce:false re-loads)
        for (const old of node.children) {
          this._purgeInternal(old);
        }
        node.children = [];

        // Attach newly loaded children
        const loaded = children.map(c => this._buildInternal(c, id));
        for (const child of loaded) {
          this._registerInternal(child);
        }
        node.children = loaded;

        // Re-apply selection cascade to newly loaded children
        if (this._selection === 'multi' && this._cascade && loaded.length > 0) {
          const changed = new Set<string>();
          const parentState = this._getCheckedState(id);
          if (parentState === 'checked') {
            // Checked parent → cascade checked state down to new children
            this._cascadeDown(node, true, changed);
          }
          // Recompute parent's own state from all (now-known) children
          const newParentState = this._computeStateFromChildren(node);
          this._applyState(id, newParentState, changed);
          // Propagate up to ancestors
          this._recomputeAncestors(id, changed);
          if (changed.size > 0) {
            this._emit({ type: 'checked', ids: [...changed] });
          }
        }

        // Re-apply active filter to newly loaded children
        if (this._filterQuery) {
          this._reapplyFilter();
        }

        // Auto-expand only if collapse() did not cancel the intent during loading
        if (this._pendingExpand.has(id)) {
          this._pendingExpand.delete(id);
          this._expanded.add(id);
        }

        this._invalidate();
        this._emit({ type: 'load', id, status: 'success' });
        this._emit({ type: 'rows' });
      },
      (error: unknown) => {
        // Staleness: discard if tree was replaced while loading
        if (this._storeEpoch !== epoch) return;
        if (!this._nodeMap.has(id)) return;

        this._loadingSet.delete(id);
        this._pendingExpand.delete(id);
        this._loadErrors.set(id, error instanceof Error ? error : new Error(String(error)));

        this._invalidate();
        this._emit({ type: 'load', id, status: 'error' });
        this._emit({ type: 'rows' });
      }
    );
  }

  // ================================================================
  // private: filter helpers
  // ================================================================

  private _deactivateFilter(): void {
    this._filterQuery = '';
    this._matchedSet.clear();
    this._filterAncestorSet.clear();
    if (this._filterExpansionSnapshot !== null) {
      this._expanded = new Set(this._filterExpansionSnapshot);
      this._filterExpansionSnapshot = null;
    }
  }

  /**
   * Recompute _matchedSet and _filterAncestorSet from _filterQuery.
   * Restores _expanded to snapshot then re-applies ancestor expansions,
   * so consecutive setFilter() calls always start from the pre-filter state.
   */
  private _reapplyFilter(): void {
    this._matchedSet.clear();
    this._filterAncestorSet.clear();

    const q = this._filterQuery.toLowerCase();
    const matchFn = this._matcher
      ? (node: TreeNodeData<T>) => this._matcher!(this._filterQuery, node)
      : (node: TreeNodeData<T>) => node.label.toLowerCase().includes(q);

    // Test all loaded nodes against the matcher (never triggers loadChildren)
    for (const [, internal] of this._nodeMap) {
      if (matchFn(internal.data)) {
        this._matchedSet.add(internal.data.id);
      }
    }

    // Restore expansion to the pre-filter snapshot before setting filter-driven expansions
    if (this._filterExpansionSnapshot !== null) {
      this._expanded = new Set(this._filterExpansionSnapshot);
    }

    // Expand all ancestors of matched nodes so matches are visible
    for (const id of this._matchedSet) {
      const internal = this._nodeMap.get(id);
      if (!internal) continue;
      let parentId = internal.parentId;
      while (parentId !== null) {
        if (this._filterAncestorSet.has(parentId)) break; // chain already processed
        this._filterAncestorSet.add(parentId);
        this._expanded.add(parentId);
        const parent = this._nodeMap.get(parentId);
        if (!parent) break;
        parentId = parent.parentId;
      }
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
