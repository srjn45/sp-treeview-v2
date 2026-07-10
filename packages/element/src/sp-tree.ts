import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { TreeStore, type TreeNodeData, type Row, type SelectionMode } from '@sp-treeview/core';

type RenderNodeFn<T> = (node: TreeNodeData<T>, ctx: { row: Row<T>; store: TreeStore<T> }) => TemplateResult;

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
  @state() private _rows: Row<T>[] = [];
  private _store: TreeStore<T> | null = null;
  private _unsub: (() => void) | null = null;
  private _ownedStore = false;

  // ---- lifecycle ----

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
  }

  // willUpdate fires before render; mutations here don't schedule a second update.
  override willUpdate(changed: PropertyValues): void {
    const storeProps = ['data', 'selection', 'cascade', 'loadOnce', 'loadChildren', 'store'];
    if (storeProps.some(k => changed.has(k))) {
      this._rebuildStore();
    }
  }

  private _rebuildStore(): void {
    const externalStore = this.store;
    if (externalStore) {
      if (this._store === externalStore) return;
      this._teardown();
      this._store = externalStore;
      this._ownedStore = false;
    } else {
      this._teardown();
      this._store = new TreeStore<T>({
        data: this.data,
        selection: this.selection,
        cascade: this.cascade,
        loadOnce: this.loadOnce,
        loadChildren: this.loadChildren,
      });
      this._ownedStore = true;
    }
    this._unsub = this._store.subscribe(() => {
      this._rows = this._store!.rows();
    });
    this._rows = this._store.rows();
  }

  private _teardown(): void {
    this._unsub?.();
    this._unsub = null;
    this._store = null;
  }

  // ---- rendering ----

  override render(): TemplateResult {
    if (!this._store) return html``;
    const store = this._store;
    const rows = this._rows;

    return html`
      <div part="tree" role="presentation">
        ${this.showAllNode ? this._renderAllRow(store) : nothing}
        ${rows.map(row => this._renderRow(row, store))}
        ${rows.length === 0 && !this.showAllNode ? html`<div part="empty" class="empty">No results</div>` : nothing}
      </div>
    `;
  }

  private _renderAllRow(store: TreeStore<T>): TemplateResult {
    const allChecked = store.rows().every(r => r.checked === 'checked') && store.rows().length > 0;
    return html`
      <div part="row all-row" class="row all-row" data-level="1">
        <span class="indent" style="--lvl:0"></span>
        <span class="toggle-placeholder"></span>
        ${this._renderCheckbox('all', allChecked ? 'checked' : 'unchecked', false, () => store.setAllChecked(!allChecked))}
        <span part="label" class="label">All</span>
      </div>
    `;
  }

  private _renderRow(row: Row<T>, store: TreeStore<T>): TemplateResult {
    const { node, level, expandable, expanded, checked, selected, loading, loadError } = row;
    const indent = level - 1;

    const labelContent = this.renderNode
      ? this.renderNode(node, { row, store })
      : html`<span part="label" class="label ${row.matched ? 'matched' : ''}">${node.label}</span>`;

    return html`
      <div
        part="row"
        class="row ${selected ? 'selected' : ''} ${node.disabled ? 'disabled' : ''}"
        data-id=${node.id}
        data-level=${level}
      >
        <span class="indent" style="--lvl:${indent}"></span>

        ${expandable
          ? html`<button
              part="toggle"
              class="toggle ${expanded ? 'expanded' : ''}"
              @click=${(e: Event) => { e.stopPropagation(); store.toggleExpanded(node.id); }}
              tabindex="-1"
              aria-hidden="true"
            >
              <svg class="toggle-icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M4 2 L9 6 L4 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>`
          : html`<span class="toggle-placeholder"></span>`}

        ${this.selection === 'multi'
          ? this._renderCheckbox(node.id, checked, !!node.disabled, () => { if (!node.disabled) store.toggleChecked(node.id); })
          : nothing}
        ${this.selection === 'single'
          ? this._renderRadio(node.id, selected, !!node.disabled, () => { if (!node.disabled) store.select(node.id); })
          : nothing}

        ${labelContent}

        ${loading ? html`<span part="spinner" class="spinner" aria-hidden="true"></span>` : nothing}
      </div>

      ${loadError
        ? html`<div part="error" class="error-row" data-id=${node.id}>
            <span class="indent" style="--lvl:${indent}"></span>
            <span class="error-msg">${loadError.message}</span>
            <button part="retry" class="retry" @click=${() => store.retryLoad(node.id)}>Retry</button>
          </div>`
        : nothing}
    `;
  }

  private _renderCheckbox(
    _id: string,
    checked: 'checked' | 'unchecked' | 'indeterminate',
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
    _id: string,
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
    }
    .row:hover {
      background: var(--sp-tree-bg-hover);
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
