import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { computePosition, autoUpdate, flip, shift, size, offset } from '@floating-ui/dom';
import { TreeStore, type TreeNodeData, type SelectionMode } from '@sp-treeview/core';
import './sp-tree.js';
import type { SpTree } from './sp-tree.js';

type RenderNodeFn<T> = SpTree<T>['renderNode'];

type SelectVariant = 'dropdown' | 'overlay';

/** Max number of rows the chips field may grow to before overflow collapses into "+N". */
const MAX_CHIP_ROWS = 2;

/**
 * `<sp-tree-select>` — a form field whose value is a tree selection.
 *
 * A chips trigger field displays the selected leaves; activating it opens a
 * panel that embeds `<sp-tree>` for selection. `variant="dropdown"` floats the
 * panel next to the field (via `@floating-ui/dom`); `variant="overlay"` shows a
 * modal sheet. The panel — and therefore every tree node — is removed from the
 * DOM while closed (never merely hidden), so collapsed panels leave no
 * interactive/tab targets behind. Form-associated via `ElementInternals`.
 */
@customElement('sp-tree-select')
export class SpTreeSelect<T = unknown> extends LitElement {
  static formAssociated = true;

  // ---- public properties ----
  @property({ reflect: true }) variant: SelectVariant = 'dropdown';
  @property() placeholder = 'Select…';

  // Forwarded to the embedded <sp-tree> / used to build the store.
  @property({ attribute: false }) data: TreeNodeData<T>[] = [];
  @property({ reflect: true }) selection: SelectionMode = 'multi';
  @property({ type: Boolean }) cascade = true;
  @property({ type: Boolean, attribute: 'load-once' }) loadOnce = true;
  @property({ attribute: false }) loadChildren: ((node: TreeNodeData<T>) => Promise<TreeNodeData<T>[]>) | undefined = undefined;
  @property({ type: Boolean }) searchable = false;
  @property({ type: Boolean, attribute: 'show-all-node' }) showAllNode = false;
  @property({ attribute: false }) renderNode: RenderNodeFn<T> | undefined = undefined;

  // Direct store prop — if provided, data/selection/cascade/loadOnce/loadChildren
  // are only used for forwarding to <sp-tree>; the store itself is reused.
  @property({ attribute: false }) store: TreeStore<T> | undefined = undefined;

  // ---- internal state ----
  @state() private _open = false;

  private _store: TreeStore<T> | null = null;
  private _unsub: (() => void) | null = null;
  private readonly _internals: ElementInternals | null;

  // Chip overflow bookkeeping. _overflowCount chips are collapsed into "+N";
  // _measureSig gates re-measuring so the two-pass measure/render settles.
  private _overflowCount = 0;
  private _measureSig: string | null = null;

  // Positioning / global-listener teardown while the panel is open.
  private _cleanupPosition: (() => void) | null = null;
  private _onDocPointer = (e: Event): void => this._handleOutside(e);
  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._open) {
      e.stopPropagation();
      this.close();
    }
  };

  constructor() {
    super();
    // ElementInternals is unavailable in some test DOMs; degrade gracefully.
    this._internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null;
  }

  // ---- lifecycle ----

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownGlobal();
    this._teardownStore();
  }

  override willUpdate(changed: PropertyValues): void {
    const storeProps = ['data', 'selection', 'cascade', 'loadOnce', 'loadChildren', 'store'];
    if (storeProps.some(k => changed.has(k))) {
      this._rebuildStore();
    }
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('_open')) {
      if (this._open) {
        this._onOpened();
      } else if (changed.get('_open') === true) {
        // Only a real open→close transition returns focus (not the first render).
        this._onClosed();
      }
    }
    this._measureChipOverflow();
  }

  // ---- store wiring ----

  private _rebuildStore(): void {
    const external = this.store;
    this._teardownStore();
    if (external) {
      this._store = external;
    } else {
      this._store = new TreeStore<T>({
        data: this.data,
        selection: this.selection,
        cascade: this.cascade,
        loadOnce: this.loadOnce,
        loadChildren: this.loadChildren,
      });
    }
    this._unsub = this._store.subscribe(() => {
      this._syncFormValue();
      // A selection change may change the chip set; force a re-measure.
      this._measureSig = null;
      this.requestUpdate();
    });
    this._syncFormValue();
  }

  private _teardownStore(): void {
    this._unsub?.();
    this._unsub = null;
    this._store = null;
  }

  // ---- selection / form ----

  /** Nodes rendered as chips: checked leaves (multi) or the selected node (single). */
  private _chipNodes(): TreeNodeData<T>[] {
    const store = this._store;
    if (!store) return [];
    if (this.selection === 'single') {
      const sel = store.getSelected();
      return sel ? [sel] : [];
    }
    if (this.selection === 'multi') return store.getCheckedLeaves();
    return [];
  }

  private _selectedIds(): string[] {
    return this._chipNodes().map(n => n.id);
  }

  private _syncFormValue(): void {
    this._internals?.setFormValue(JSON.stringify(this._selectedIds()));
  }

  private _removeChip(node: TreeNodeData<T>): void {
    const store = this._store;
    if (!store || node.disabled) return;
    if (this.selection === 'multi') {
      // setChecked cascades to ancestors so indeterminate/checked stay correct.
      store.setChecked(node.id, false);
      this._dispatchChange();
    }
    // Single mode has no store-level deselect; chips there are informational.
  }

  private _dispatchChange(): void {
    const store = this._store;
    if (!store) return;
    if (this.selection === 'single') {
      this._dispatch('sp-change', { selected: store.getSelected() });
    } else if (this.selection === 'multi') {
      this._dispatch('sp-change', { checked: store.getChecked(), allSelected: store.isAllChecked() });
    }
  }

  private _dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  // ---- open / close ----

  open(): void {
    if (this._open) return;
    this._open = true;
  }

  close(): void {
    if (!this._open) return;
    this._open = false;
  }

  toggle(): void {
    if (this._open) this.close();
    else this.open();
  }

  private _onOpened(): void {
    document.addEventListener('pointerdown', this._onDocPointer, true);
    document.addEventListener('keydown', this._onDocKeydown, true);
    if (this.variant === 'dropdown') this._startPositioning();
    // Move focus INTO the panel.
    this._focusPanel();
  }

  private _onClosed(): void {
    this._teardownGlobal();
    this._focusField();
  }

  private _teardownGlobal(): void {
    document.removeEventListener('pointerdown', this._onDocPointer, true);
    document.removeEventListener('keydown', this._onDocKeydown, true);
    this._cleanupPosition?.();
    this._cleanupPosition = null;
  }

  private _handleOutside(e: Event): void {
    const path = e.composedPath();
    if (!path.includes(this)) this.close();
  }

  private _fieldEl(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('[part~="field"]') ?? null;
  }

  private _panelEl(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('[part~="panel"]') ?? null;
  }

  private _focusPanel(): void {
    // Prefer the search box, then the embedded tree, then the panel itself.
    const panel = this._panelEl();
    if (!panel) return;
    const tree = panel.querySelector('sp-tree');
    const searchInput = tree?.shadowRoot?.querySelector<HTMLElement>('[part="search-input"]');
    if (searchInput) {
      searchInput.focus();
      return;
    }
    const treeitem = tree?.shadowRoot?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]');
    if (treeitem) {
      treeitem.focus();
      return;
    }
    panel.focus();
  }

  private _focusField(): void {
    this._fieldEl()?.focus();
  }

  private async _startPositioning(): Promise<void> {
    const field = this._fieldEl();
    const panel = this._panelEl();
    if (!field || !panel) return;
    const update = async (): Promise<void> => {
      try {
        const { x, y } = await computePosition(field, panel, {
          placement: 'bottom-start',
          middleware: [
            offset(4),
            flip(),
            shift({ padding: 8 }),
            size({
              apply({ rects, elements, availableHeight }) {
                Object.assign(elements.floating.style, {
                  minWidth: `${rects.reference.width}px`,
                  maxHeight: `${Math.max(120, availableHeight - 8)}px`,
                });
              },
            }),
          ],
        });
        Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
      } catch {
        // Layout-less environments (tests) — positioning is a no-op.
      }
    };
    try {
      this._cleanupPosition = autoUpdate(field, panel, update);
    } catch {
      void update();
    }
  }

  // ---- chip overflow (wrap to MAX_CHIP_ROWS then collapse into "+N") ----

  private _measureChipOverflow(): void {
    if (this._open) return; // only the collapsed trigger clips chips
    const field = this._fieldEl();
    const chipsBox = field?.querySelector<HTMLElement>('.chips');
    if (!chipsBox) return;

    const nodes = this._chipNodes();
    const sig = `${nodes.map(n => n.id).join(',')}@${field?.clientWidth ?? 0}`;
    if (sig === this._measureSig) return;

    // First settle a full (un-collapsed) render, then measure against it.
    if (this._overflowCount !== 0) {
      this._overflowCount = 0;
      this.requestUpdate();
      return;
    }

    this._measureSig = sig;
    const chips = Array.from(chipsBox.querySelectorAll<HTMLElement>('[part~="chip"]'));
    if (chips.length === 0) return;

    const firstTop = chips[0]!.offsetTop;
    const stride = chips[0]!.offsetHeight || 0;
    // Top offset at which the (MAX_CHIP_ROWS+1)-th row begins.
    const overflowTop = firstTop + MAX_CHIP_ROWS * stride;
    let overflow = 0;
    if (stride > 0) {
      for (const chip of chips) {
        if (chip.offsetTop >= overflowTop) overflow++;
      }
    }
    if (overflow > 0 && overflow !== this._overflowCount) {
      this._overflowCount = overflow;
      this.requestUpdate();
    }
  }

  // ---- rendering ----

  override render(): TemplateResult {
    return html`
      ${this._renderField()}
      ${this._open ? this._renderPanel() : nothing}
    `;
  }

  private _renderField(): TemplateResult {
    const nodes = this._chipNodes();
    const empty = nodes.length === 0;
    const visible = this._overflowCount > 0 ? nodes.slice(0, nodes.length - this._overflowCount) : nodes;

    return html`
      <div
        part="field"
        class="field ${empty ? 'empty' : ''}"
        role="combobox"
        tabindex="0"
        aria-haspopup=${this.variant === 'overlay' ? 'dialog' : 'tree'}
        aria-expanded=${this._open ? 'true' : 'false'}
        @click=${this._onFieldClick}
        @keydown=${this._onFieldKeydown}
      >
        <span class="chips">
          ${empty
            ? html`<span part="placeholder" class="placeholder">${this.placeholder}</span>`
            : visible.map(node => this._renderChip(node))}
          ${this._overflowCount > 0
            ? html`<span part="chip chip-overflow" class="chip overflow">+${this._overflowCount}</span>`
            : nothing}
        </span>
        <span class="caret ${this._open ? 'open' : ''}" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 L6 8 L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </div>
    `;
  }

  private _renderChip(node: TreeNodeData<T>): TemplateResult {
    const removable = this.selection === 'multi' && !node.disabled;
    return html`
      <span part="chip" class="chip" data-id=${node.id}>
        <span class="chip-label">${node.label}</span>
        ${removable
          ? html`<button
              part="chip-remove"
              class="chip-remove"
              type="button"
              aria-label=${`Remove ${node.label}`}
              @click=${(e: Event) => { e.stopPropagation(); this._removeChip(node); }}
            >
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>`
          : nothing}
      </span>
    `;
  }

  private _renderPanel(): TemplateResult {
    const tree = html`
      <sp-tree
        exportparts="tree, row, all-row, toggle, checkbox, radio, label, match, spinner, error, retry, search, search-input, search-clear, empty"
        .store=${this._store ?? undefined}
        .selection=${this.selection}
        .cascade=${this.cascade}
        .loadOnce=${this.loadOnce}
        .loadChildren=${this.loadChildren}
        .searchable=${this.searchable}
        .showAllNode=${this.showAllNode}
        .renderNode=${this.renderNode}
        @sp-change=${this._onTreeChange}
      ></sp-tree>
      <div class="panel-footer">
        <button part="done" class="done" type="button" @click=${() => this.close()}>Done</button>
      </div>
    `;

    if (this.variant === 'overlay') {
      return html`
        <div part="backdrop" class="backdrop" @click=${() => this.close()}></div>
        <div
          part="panel"
          class="panel overlay"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          @keydown=${this._onPanelKeydown}
        >${tree}</div>
      `;
    }

    return html`
      <div
        part="panel"
        class="panel dropdown"
        role="dialog"
        tabindex="-1"
        @keydown=${this._onPanelKeydown}
      >${tree}</div>
    `;
  }

  private _onTreeChange(e: Event): void {
    // Re-emit the tree's change as this element's change (bubbles past the panel).
    e.stopPropagation();
    this._dispatchChange();
  }

  private _onFieldClick(): void {
    this.toggle();
  }

  private _onFieldKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        this.open();
        break;
      case 'Escape':
        if (this._open) {
          e.preventDefault();
          this.close();
        }
        break;
      default:
        break;
    }
  }

  private _onPanelKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    }
  }

  // ---- styles ----

  static override styles = css`
    :host {
      --sp-tree-font-family: system-ui, sans-serif;
      --sp-tree-font-size: 14px;
      --sp-tree-row-height: 36px;
      --sp-tree-indent: 20px;
      --sp-tree-radius: 4px;
      --sp-tree-fg: #1a1a1a;
      --sp-tree-fg-muted: #6b7280;
      --sp-tree-bg: #ffffff;
      --sp-tree-bg-hover: #f3f4f6;
      --sp-tree-accent: #3b82f6;
      --sp-tree-accent-fg: #ffffff;
      --sp-tree-border: #d1d5db;
      --sp-tree-danger: #ef4444;
      --sp-tree-chip-bg: #e5e7eb;
      --sp-tree-chip-fg: #374151;
      --sp-tree-panel-bg: #ffffff;
      --sp-tree-panel-shadow: 0 4px 16px rgba(0, 0, 0, .12);
      --sp-tree-focus-ring: 0 0 0 2px var(--sp-tree-accent);

      display: block;
      position: relative;
      font-family: var(--sp-tree-font-family);
      font-size: var(--sp-tree-font-size);
      color: var(--sp-tree-fg);
    }

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
        --sp-tree-panel-shadow: 0 4px 16px rgba(0, 0, 0, .4);
      }
    }

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
      --sp-tree-panel-shadow: 0 4px 16px rgba(0, 0, 0, .4);
    }

    /* Trigger field */
    .field {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-height: var(--sp-tree-row-height);
      padding: 4px 8px;
      box-sizing: border-box;
      border: 1px solid var(--sp-tree-border);
      border-radius: var(--sp-tree-radius);
      background: var(--sp-tree-bg);
      cursor: pointer;
      outline: none;
    }
    .field:focus-visible {
      box-shadow: var(--sp-tree-focus-ring);
      border-color: var(--sp-tree-accent);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 4px;
      flex: 1;
      min-width: 0;
      /* Clip to MAX_CHIP_ROWS; overflow is surfaced via the "+N" chip. */
      max-height: calc(2 * (1.5em + 8px));
      overflow: hidden;
    }

    .placeholder {
      color: var(--sp-tree-fg-muted);
      align-self: center;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 100%;
      padding: 2px 6px;
      box-sizing: border-box;
      border-radius: var(--sp-tree-radius);
      background: var(--sp-tree-chip-bg);
      color: var(--sp-tree-chip-fg);
      font-size: 0.9em;
      line-height: 1.4;
    }
    .chip.overflow {
      font-weight: 600;
    }
    .chip-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: none;
      color: inherit;
      cursor: pointer;
      flex-shrink: 0;
    }
    .chip-remove:hover {
      background: color-mix(in srgb, var(--sp-tree-chip-fg) 20%, transparent);
    }

    .caret {
      display: inline-flex;
      align-items: center;
      align-self: center;
      color: var(--sp-tree-fg-muted);
      flex-shrink: 0;
      transition: transform 0.15s;
    }
    .caret.open {
      transform: rotate(180deg);
    }

    /* Dropdown panel */
    .panel {
      box-sizing: border-box;
      background: var(--sp-tree-panel-bg);
      border: 1px solid var(--sp-tree-border);
      border-radius: var(--sp-tree-radius);
      box-shadow: var(--sp-tree-panel-shadow);
      outline: none;
      overflow: auto;
    }
    .panel.dropdown {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1000;
      max-height: 320px;
    }

    /* Overlay (modal sheet) */
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, .4);
    }
    .panel.overlay {
      position: fixed;
      z-index: 1001;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(92vw, 420px);
      max-height: 80vh;
    }

    .panel-footer {
      display: flex;
      justify-content: flex-end;
      padding: 8px;
      border-top: 1px solid var(--sp-tree-border);
      position: sticky;
      bottom: 0;
      background: var(--sp-tree-panel-bg);
    }
    .done {
      padding: 6px 14px;
      border: none;
      border-radius: var(--sp-tree-radius);
      background: var(--sp-tree-accent);
      color: var(--sp-tree-accent-fg);
      cursor: pointer;
      font: inherit;
    }
    .done:focus-visible {
      box-shadow: var(--sp-tree-focus-ring);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'sp-tree-select': SpTreeSelect;
  }
}
