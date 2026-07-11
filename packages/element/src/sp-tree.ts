import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { TreeStore, type TreeNodeData, type Row, type SelectionMode, type CheckedState } from '@sp-treeview/core';

type RenderNodeFn<T> = (node: TreeNodeData<T>, ctx: { row: Row<T>; store: TreeStore<T> }) => TemplateResult;

/**
 * Internal sentinel id for the optional "All" row. It is NOT a node in the
 * consumer data (there is no sentinel ALL node); it only participates in the
 * element's roving-focus navigation and is wired to store.setAllChecked.
 */
const ALL_ID = '__sp_all__';

/** How long (ms) type-ahead keystrokes accumulate before the buffer resets. */
const TYPEAHEAD_RESET_MS = 500;

/** A single navigable row (a data row or the synthetic "All" row). */
interface NavItem<T> {
  id: string;
  level: number;
  expandable: boolean;
  expanded: boolean;
  disabled: boolean;
  isAll: boolean;
  node?: TreeNodeData<T>;
  row?: Row<T>;
}

@customElement('sp-tree')
export class SpTree<T = unknown> extends LitElement {
  // ---- public properties ----
  @property({ attribute: false }) data: TreeNodeData<T>[] = [];
  @property({ reflect: true }) selection: SelectionMode = 'none';
  @property({ type: Boolean }) cascade = true;
  @property({ type: Boolean, attribute: 'load-once' }) loadOnce = true;
  @property({ attribute: false }) loadChildren: ((node: TreeNodeData<T>) => Promise<TreeNodeData<T>[]>) | undefined = undefined;
  @property({ type: Boolean }) searchable = false;
  @property({ type: Boolean, attribute: 'show-all-node' }) showAllNode = false;
  @property({ attribute: false }) renderNode: RenderNodeFn<T> | undefined = undefined;

  // Direct store prop — if provided, data/selection/cascade/loadOnce/loadChildren are ignored.
  @property({ attribute: false }) store: TreeStore<T> | undefined = undefined;

  // ---- internal state ----
  // _rows drives rendering; kept as a plain field + explicit requestUpdate so
  // navigation/focus bookkeeping never triggers extra reactive churn.
  private _rows: Row<T>[] = [];
  private _store: TreeStore<T> | null = null;
  private _unsub: (() => void) | null = null;

  // ---- roving focus / keyboard state ----
  private _activeId: string | null = null;   // node id (or ALL_ID) that owns the single tab stop
  private _shouldFocus = false;               // move DOM focus to the active row after the next render
  private _typeBuffer = '';
  private _typeTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- lifecycle ----

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
    if (this._typeTimer !== null) {
      clearTimeout(this._typeTimer);
      this._typeTimer = null;
    }
  }

  // willUpdate fires before render; mutations here don't schedule a second update.
  override willUpdate(changed: PropertyValues): void {
    const storeProps = ['data', 'selection', 'cascade', 'loadOnce', 'loadChildren', 'store'];
    if (storeProps.some(k => changed.has(k))) {
      this._rebuildStore();
    }
  }

  override updated(): void {
    if (this._shouldFocus) {
      this._shouldFocus = false;
      this._focusActive();
    }
  }

  private _rebuildStore(): void {
    const externalStore = this.store;
    if (externalStore) {
      if (this._store === externalStore) return;
      this._teardown();
      this._store = externalStore;
    } else {
      this._teardown();
      this._store = new TreeStore<T>({
        data: this.data,
        selection: this.selection,
        cascade: this.cascade,
        loadOnce: this.loadOnce,
        loadChildren: this.loadChildren,
      });
    }
    this._unsub = this._store.subscribe(() => {
      this._rows = this._store!.rows();
      this.requestUpdate();
    });
    this._rows = this._store.rows();
    // Reset the active row when the underlying store changes.
    this._activeId = null;
  }

  private _teardown(): void {
    this._unsub?.();
    this._unsub = null;
    this._store = null;
  }

  // ---- navigation model ----

  private _navList(): NavItem<T>[] {
    const items: NavItem<T>[] = [];
    if (this.showAllNode) {
      items.push({ id: ALL_ID, level: 1, expandable: false, expanded: false, disabled: false, isAll: true });
    }
    for (const row of this._rows) {
      items.push({
        id: row.node.id,
        level: row.level,
        expandable: row.expandable,
        expanded: row.expanded,
        disabled: !!row.node.disabled,
        isAll: false,
        node: row.node,
        row,
      });
    }
    return items;
  }

  /** Ensure _activeId points at a currently-present nav item (falls back to first). */
  private _normalizeActive(nav: NavItem<T>[]): void {
    if (nav.length === 0) {
      this._activeId = null;
      return;
    }
    if (this._activeId === null || !nav.some(n => n.id === this._activeId)) {
      this._activeId = nav[0]!.id;
    }
  }

  private _setActive(id: string): void {
    this._activeId = id;
    this._shouldFocus = true;
    this.requestUpdate();
  }

  private _focusActive(): void {
    if (this._activeId === null) return;
    const treeitems = this.shadowRoot?.querySelectorAll<HTMLElement>('[role="treeitem"]');
    treeitems?.forEach(el => {
      if (el.dataset['navId'] === this._activeId) el.focus();
    });
  }

  private _findParent(nav: NavItem<T>[], idx: number): NavItem<T> | null {
    const level = nav[idx]!.level;
    for (let i = idx - 1; i >= 0; i--) {
      if (nav[i]!.level < level) return nav[i]!;
    }
    return null;
  }

  // ---- keyboard ----

  private _onKeydown(e: KeyboardEvent): void {
    const nav = this._navList();
    if (nav.length === 0) return;

    let idx = nav.findIndex(n => n.id === this._activeId);
    if (idx === -1) idx = 0;
    const cur = nav[idx]!;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._setActive(nav[Math.min(idx + 1, nav.length - 1)]!.id);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._setActive(nav[Math.max(idx - 1, 0)]!.id);
        break;
      case 'Home':
        e.preventDefault();
        this._setActive(nav[0]!.id);
        break;
      case 'End':
        e.preventDefault();
        this._setActive(nav[nav.length - 1]!.id);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (cur.expandable && !cur.expanded) {
          this._expandRow(cur);
        } else if (cur.expandable && cur.expanded && idx + 1 < nav.length) {
          // Move to the first child (immediately follows an expanded parent).
          this._setActive(nav[idx + 1]!.id);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (cur.expandable && cur.expanded) {
          this._collapseRow(cur);
        } else {
          const parent = this._findParent(nav, idx);
          if (parent) this._setActive(parent.id);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._activate(cur);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          this._typeAhead(e.key, nav, idx);
        }
        break;
    }
  }

  private _typeAhead(char: string, nav: NavItem<T>[], idx: number): void {
    if (this._typeTimer !== null) clearTimeout(this._typeTimer);
    this._typeBuffer += char.toLowerCase();
    this._typeTimer = setTimeout(() => { this._typeBuffer = ''; }, TYPEAHEAD_RESET_MS);

    const buffer = this._typeBuffer;
    const labelOf = (n: NavItem<T>): string => (n.isAll ? 'all' : (n.node?.label ?? '')).toLowerCase();
    const n = nav.length;
    // On the first character search from the next row; while building a word,
    // include the current row so a match can stay put.
    const start = buffer.length > 1 ? 0 : 1;
    for (let i = start; i < start + n; i++) {
      const cand = nav[(idx + i) % n]!;
      if (labelOf(cand).startsWith(buffer)) {
        this._setActive(cand.id);
        return;
      }
    }
  }

  // ---- interaction handlers (also emit events) ----

  private _activate(item: NavItem<T>): void {
    if (item.isAll) {
      this._toggleAll();
      return;
    }
    const node = item.node!;
    if (node.disabled) return;
    if (this.selection === 'multi') {
      this._store!.toggleChecked(node.id);
      this._dispatchChange();
    } else if (this.selection === 'single') {
      this._store!.select(node.id);
      this._dispatchChange();
    } else if (item.expandable && item.row) {
      this._toggleExpanded(item.row);
    }
  }

  private _toggleExpanded(row: Row<T>): void {
    const willExpand = !row.expanded;
    this._store!.toggleExpanded(row.node.id);
    this._dispatch(willExpand ? 'sp-expand' : 'sp-collapse', { node: row.node });
  }

  private _expandRow(item: NavItem<T>): void {
    if (!item.node) return;
    this._store!.expand(item.node.id);
    this._dispatch('sp-expand', { node: item.node });
  }

  private _collapseRow(item: NavItem<T>): void {
    if (!item.node) return;
    this._store!.collapse(item.node.id);
    this._dispatch('sp-collapse', { node: item.node });
  }

  private _toggleAll(): void {
    const all = this._store!.isAllChecked();
    this._store!.setAllChecked(!all);
    this._dispatchChange();
  }

  private _toggleChecked(node: TreeNodeData<T>): void {
    if (node.disabled) return;
    this._store!.toggleChecked(node.id);
    this._dispatchChange();
  }

  private _select(node: TreeNodeData<T>): void {
    if (node.disabled) return;
    this._store!.select(node.id);
    this._dispatchChange();
  }

  private _dispatchChange(): void {
    if (this.selection === 'single') {
      this._dispatch('sp-change', { selected: this._store!.getSelected() });
    } else if (this.selection === 'multi') {
      this._dispatch('sp-change', {
        checked: this._store!.getChecked(),
        allSelected: this._store!.isAllChecked(),
      });
    }
  }

  private _dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  // ---- rendering ----

  override render(): TemplateResult {
    if (!this._store) return html``;
    const store = this._store;
    const nav = this._navList();
    this._normalizeActive(nav);
    const activeId = this._activeId;
    const rows = this._rows;

    return html`
      <div
        part="tree"
        role="tree"
        aria-multiselectable=${this.selection === 'multi' ? 'true' : nothing}
        @keydown=${this._onKeydown}
      >
        ${this.showAllNode ? this._renderAllRow(store, activeId) : nothing}
        ${rows.map(row => this._renderRow(row, store, activeId))}
        ${rows.length === 0 && !this.showAllNode ? html`<div part="empty" class="empty" role="presentation">No results</div>` : nothing}
      </div>
    `;
  }

  private _renderAllRow(store: TreeStore<T>, activeId: string | null): TemplateResult {
    const all = store.isAllChecked();
    const anyChecked = store.getChecked().length > 0 || store.getCheckedLeaves().length > 0;
    const state: CheckedState = all ? 'checked' : anyChecked ? 'indeterminate' : 'unchecked';
    return html`
      <div
        part="row all-row"
        class="row all-row"
        role="treeitem"
        data-nav-id=${ALL_ID}
        data-level="1"
        aria-level="1"
        aria-checked=${state === 'indeterminate' ? 'mixed' : String(state === 'checked')}
        tabindex=${ALL_ID === activeId ? 0 : -1}
        @click=${() => this._toggleAll()}
        @focus=${this._onRowFocus(ALL_ID)}
      >
        <span class="indent" style="--lvl:0"></span>
        <span class="toggle-placeholder"></span>
        ${this._renderCheckbox(state, false, () => this._toggleAll())}
        <span part="label" class="label">All</span>
      </div>
    `;
  }

  private _renderRow(row: Row<T>, store: TreeStore<T>, activeId: string | null): TemplateResult {
    const { node, level, expandable, expanded, checked, selected, loading, loadError } = row;
    const indent = level - 1;

    const labelContent = this.renderNode
      ? this.renderNode(node, { row, store })
      : html`<span part="label" class="label ${row.matched ? 'matched' : ''}">${node.label}</span>`;

    return html`
      <div
        part="row"
        class="row ${selected ? 'selected' : ''} ${node.disabled ? 'disabled' : ''}"
        role="treeitem"
        data-nav-id=${node.id}
        data-id=${node.id}
        data-level=${level}
        aria-level=${level}
        aria-setsize=${row.setSize}
        aria-posinset=${row.posInSet}
        aria-expanded=${expandable ? String(expanded) : nothing}
        aria-checked=${this._ariaChecked(row)}
        aria-disabled=${node.disabled ? 'true' : nothing}
        aria-busy=${loading ? 'true' : nothing}
        tabindex=${node.id === activeId ? 0 : -1}
        @click=${() => this._onRowClick(row)}
        @focus=${this._onRowFocus(node.id)}
      >
        <span class="indent" style="--lvl:${indent}"></span>

        ${expandable
          ? html`<button
              part="toggle"
              class="toggle ${expanded ? 'expanded' : ''}"
              @click=${(e: Event) => { e.stopPropagation(); this._toggleExpanded(row); }}
              tabindex="-1"
              aria-hidden="true"
            >
              <svg class="toggle-icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M4 2 L9 6 L4 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>`
          : html`<span class="toggle-placeholder"></span>`}

        ${this.selection === 'multi'
          ? this._renderCheckbox(checked, !!node.disabled, () => this._toggleChecked(node))
          : nothing}
        ${this.selection === 'single'
          ? this._renderRadio(selected, !!node.disabled, () => this._select(node))
          : nothing}

        ${labelContent}

        ${loading ? html`<span part="spinner" class="spinner" aria-hidden="true"></span>` : nothing}
      </div>

      ${loadError
        ? html`<div part="error" class="error-row" role="presentation" data-id=${node.id}>
            <span class="indent" style="--lvl:${indent}"></span>
            <span class="error-msg">${loadError.message}</span>
            <button part="retry" class="retry" @click=${() => store.retryLoad(node.id)}>Retry</button>
          </div>`
        : nothing}
    `;
  }

  private _ariaChecked(row: Row<T>): string | typeof nothing {
    if (this.selection === 'multi') {
      if (row.checked === 'indeterminate') return 'mixed';
      return String(row.checked === 'checked');
    }
    if (this.selection === 'single') return String(row.selected);
    return nothing;
  }

  private _onRowFocus(id: string): () => void {
    return () => { this._activeId = id; };
  }

  private _onRowClick(row: Row<T>): void {
    this._activeId = row.node.id;
    if (row.node.disabled) return;
    if (this.selection === 'multi') {
      this._toggleChecked(row.node);
    } else if (this.selection === 'single') {
      this._select(row.node);
    } else if (row.expandable) {
      this._toggleExpanded(row);
    }
  }

  private _renderCheckbox(
    checked: CheckedState,
    disabled: boolean,
    onClick: () => void,
  ): TemplateResult {
    return html`
      <span
        part="checkbox"
        class="checkbox ${checked} ${disabled ? 'disabled' : ''}"
        data-checked=${checked}
        @click=${(e: Event) => { e.stopPropagation(); onClick(); }}
        aria-hidden="true"
      >
        ${checked === 'checked'
          ? html`<svg class="check-icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M2 6 L5 9 L10 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
          : checked === 'indeterminate'
          ? html`<svg class="check-icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M2 6 L10 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            </svg>`
          : nothing}
      </span>
    `;
  }

  private _renderRadio(
    selected: boolean,
    disabled: boolean,
    onClick: () => void,
  ): TemplateResult {
    return html`
      <span
        part="radio"
        class="radio ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
        data-selected=${selected}
        @click=${(e: Event) => { e.stopPropagation(); onClick(); }}
        aria-hidden="true"
      >
        ${selected ? html`<span class="radio-dot"></span>` : nothing}
      </span>
    `;
  }

  // ---- styles ----

  static override styles = css`
    :host {
      /* Font */
      --sp-tree-font-family: system-ui, sans-serif;
      --sp-tree-font-size: 14px;
      /* Layout */
      --sp-tree-row-height: 36px;
      --sp-tree-indent: 20px;
      --sp-tree-radius: 4px;
      /* Colors — light defaults */
      --sp-tree-fg: #1a1a1a;
      --sp-tree-fg-muted: #6b7280;
      --sp-tree-bg: #ffffff;
      --sp-tree-bg-hover: #f3f4f6;
      --sp-tree-accent: #3b82f6;
      --sp-tree-accent-fg: #ffffff;
      --sp-tree-border: #d1d5db;
      --sp-tree-danger: #ef4444;
      /* Chip / panel (used by sp-tree-select) */
      --sp-tree-chip-bg: #e5e7eb;
      --sp-tree-chip-fg: #374151;
      --sp-tree-panel-bg: #ffffff;
      --sp-tree-panel-shadow: 0 4px 16px rgba(0,0,0,.12);
      --sp-tree-focus-ring: 0 0 0 2px var(--sp-tree-accent);

      display: block;
      font-family: var(--sp-tree-font-family);
      font-size: var(--sp-tree-font-size);
      color: var(--sp-tree-fg);
      background: var(--sp-tree-bg);
    }

    /* Dark-theme defaults */
    @media (prefers-color-scheme: dark) {
      :host {
        --sp-tree-fg: #f3f4f6;
        --sp-tree-fg-muted: #9ca3af;
        --sp-tree-bg: #1f2937;
        --sp-tree-bg-hover: #374151;
        --sp-tree-accent: #60a5fa;
        --sp-tree-accent-fg: #0f172a;
        --sp-tree-border: #4b5563;
        --sp-tree-danger: #f87171;
        --sp-tree-chip-bg: #374151;
        --sp-tree-chip-fg: #e5e7eb;
        --sp-tree-panel-bg: #1f2937;
        --sp-tree-panel-shadow: 0 4px 16px rgba(0,0,0,.4);
      }
    }

    /* Opt-in dark theme via data attribute */
    :host([data-theme="dark"]) {
      --sp-tree-fg: #f3f4f6;
      --sp-tree-fg-muted: #9ca3af;
      --sp-tree-bg: #1f2937;
      --sp-tree-bg-hover: #374151;
      --sp-tree-accent: #60a5fa;
      --sp-tree-accent-fg: #0f172a;
      --sp-tree-border: #4b5563;
      --sp-tree-danger: #f87171;
      --sp-tree-chip-bg: #374151;
      --sp-tree-chip-fg: #e5e7eb;
      --sp-tree-panel-bg: #1f2937;
      --sp-tree-panel-shadow: 0 4px 16px rgba(0,0,0,.4);
    }

    [role="tree"] {
      outline: none;
    }

    .row {
      display: flex;
      align-items: center;
      min-height: var(--sp-tree-row-height);
      padding: 0 8px;
      gap: 4px;
      box-sizing: border-box;
      cursor: default;
      border-radius: var(--sp-tree-radius);
      transition: background 0.1s;
      outline: none;
    }
    .row:hover {
      background: var(--sp-tree-bg-hover);
    }
    .row:focus-visible {
      box-shadow: var(--sp-tree-focus-ring);
    }
    .row.selected {
      background: color-mix(in srgb, var(--sp-tree-accent) 12%, transparent);
    }
    .row.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .indent {
      display: inline-block;
      width: calc(var(--lvl) * var(--sp-tree-indent));
      flex-shrink: 0;
    }

    /* Toggle button */
    .toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      background: none;
      color: var(--sp-tree-fg-muted);
      cursor: pointer;
      flex-shrink: 0;
      border-radius: var(--sp-tree-radius);
      transition: color 0.1s;
    }
    .toggle:hover {
      color: var(--sp-tree-fg);
    }
    .toggle.expanded .toggle-icon {
      transform: rotate(90deg);
    }
    .toggle-icon {
      transition: transform 0.15s;
      display: block;
    }
    .toggle-placeholder {
      display: inline-block;
      width: 20px;
      flex-shrink: 0;
    }

    /* Checkbox — custom-drawn via CSS + inline SVG, no native appearance */
    .checkbox {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--sp-tree-border);
      border-radius: 3px;
      background: var(--sp-tree-bg);
      flex-shrink: 0;
      cursor: pointer;
      transition: border-color 0.1s, background 0.1s;
      box-sizing: border-box;
    }
    .checkbox.checked,
    .checkbox.indeterminate {
      background: var(--sp-tree-accent);
      border-color: var(--sp-tree-accent);
      color: var(--sp-tree-accent-fg);
    }
    .checkbox.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Radio — custom-drawn, no native appearance */
    .radio {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--sp-tree-border);
      border-radius: 50%;
      background: var(--sp-tree-bg);
      flex-shrink: 0;
      cursor: pointer;
      box-sizing: border-box;
      transition: border-color 0.1s;
    }
    .radio.selected {
      border-color: var(--sp-tree-accent);
    }
    .radio-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sp-tree-accent);
    }
    .radio.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Label */
    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .label.matched {
      font-weight: 600;
    }

    /* Inline spinner — per-node, not full-width */
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid var(--sp-tree-border);
      border-top-color: var(--sp-tree-accent);
      border-radius: 50%;
      animation: sp-spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes sp-spin {
      to { transform: rotate(360deg); }
    }

    /* Error row */
    .error-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      color: var(--sp-tree-danger);
      font-size: 0.9em;
    }
    .error-msg {
      flex: 1;
    }
    .retry {
      padding: 2px 8px;
      font-size: 0.85em;
      border: 1px solid var(--sp-tree-danger);
      border-radius: var(--sp-tree-radius);
      background: none;
      color: var(--sp-tree-danger);
      cursor: pointer;
    }
    .retry:hover {
      background: color-mix(in srgb, var(--sp-tree-danger) 10%, transparent);
    }

    /* Empty state */
    .empty {
      padding: 16px 8px;
      color: var(--sp-tree-fg-muted);
      text-align: center;
    }

    /* All-row */
    .all-row {
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'sp-tree': SpTree;
  }
}
