# Theming `@sp-treeview/element`

`<sp-tree>` and `<sp-tree-select>` are fully themeable **without touching the
shadow DOM source**:

1. **Tokens** — every color, size, and font value is a `--sp-tree-*` CSS custom
   property. Override any of them on the element (or any ancestor) and the value
   cascades into the shadow DOM.
2. **Parts** — structural restyling (borders, spacing, custom checkbox shapes,
   …) uses `::part()` selectors on the exposed shadow parts.

The elements ship **light-first defaults** on `:host`, with dark values applied
automatically under `@media (prefers-color-scheme: dark)` **and** opt-in via a
`data-theme="dark"` attribute on the element.

---

## Token table

All tokens, with their built-in light and dark defaults. Layout/typography tokens
(font, sizes) are shared across both themes; only colors change for dark.

| Token | Light default | Dark default | Controls |
|---|---|---|---|
| `--sp-tree-font-family` | `system-ui, sans-serif` | *(same)* | Font family for the whole widget. |
| `--sp-tree-font-size` | `14px` | *(same)* | Base font size. |
| `--sp-tree-row-height` | `36px` | *(same)* | Min row height; also the search input height. |
| `--sp-tree-indent` | `20px` | *(same)* | Indent added per nesting level. |
| `--sp-tree-radius` | `4px` | *(same)* | Corner radius on rows, inputs, chips, panel. |
| `--sp-tree-fg` | `#1a1a1a` | `#f3f4f6` | Primary text color. |
| `--sp-tree-fg-muted` | `#6b7280` | `#9ca3af` | Secondary text (toggles, placeholder, empty state). |
| `--sp-tree-bg` | `#ffffff` | `#1f2937` | Widget background; checkbox/radio fill. |
| `--sp-tree-bg-hover` | `#f3f4f6` | `#374151` | Row/clear-button hover background. |
| `--sp-tree-accent` | `#3b82f6` | `#60a5fa` | Checked/selected accent; focus ring; spinner. |
| `--sp-tree-accent-fg` | `#ffffff` | `#0f172a` | Foreground on accent (check glyph, Done button text). |
| `--sp-tree-border` | `#d1d5db` | `#4b5563` | Borders on rows, inputs, checkboxes, panel. |
| `--sp-tree-danger` | `#ef4444` | `#f87171` | Load-error text and Retry button. |
| `--sp-tree-chip-bg` | `#e5e7eb` | `#374151` | `<sp-tree-select>` chip background. |
| `--sp-tree-chip-fg` | `#374151` | `#e5e7eb` | `<sp-tree-select>` chip text. |
| `--sp-tree-panel-bg` | `#ffffff` | `#1f2937` | Dropdown/overlay panel background. |
| `--sp-tree-panel-shadow` | `0 4px 16px rgba(0,0,0,.12)` | `0 4px 16px rgba(0,0,0,.4)` | Panel drop shadow. |
| `--sp-tree-focus-ring` | `0 0 0 2px var(--sp-tree-accent)` | *(same)* | `box-shadow` focus indicator. |

Override tokens wherever you like — on the element, or on a container to theme
many at once:

```css
/* one element */
sp-tree { --sp-tree-accent: #16a34a; --sp-tree-row-height: 28px; }

/* everything inside a container */
.compact-theme { --sp-tree-font-size: 13px; --sp-tree-indent: 14px; }
```

---

## Shadow parts

Target internal elements with `::part()`. Parts exposed by **`<sp-tree>`**:

| Part | Element |
|---|---|
| `tree` | The `role="tree"` container. |
| `row` | A tree row (`role="treeitem"`). |
| `all-row` | The optional "All" row (`showAllNode`). |
| `toggle` | Expand/collapse chevron button. |
| `checkbox` | Custom-drawn checkbox (multi). |
| `radio` | Custom-drawn radio (single). |
| `label` | The row's text label. |
| `match` | `<mark>` around a search match. |
| `spinner` | Per-node lazy-load spinner. |
| `error` | Inline load-error row. |
| `retry` | Retry button in an error row. |
| `search` | Search box wrapper. |
| `search-input` | Search `<input>`. |
| `search-clear` | Clear (✕) button. |
| `empty` | "No results" empty state. |

Additional parts on **`<sp-tree-select>`** (it also re-exports every `<sp-tree>`
part above via `exportparts`, so `sp-tree-select::part(row)` works too):

| Part | Element |
|---|---|
| `field` | The trigger/combobox field. |
| `placeholder` | Placeholder text when empty. |
| `chip` | A selected-value chip. |
| `chip-overflow` | The `+N` overflow chip. |
| `chip-remove` | Per-chip remove button. |
| `backdrop` | Overlay-variant modal backdrop. |
| `panel` | The dropdown/overlay panel. |
| `done` | The panel's Done button. |

Checkboxes and radios are **custom-drawn** (CSS box + inline SVG glyph) rather
than native inputs, so they follow the tokens exactly and look identical across
browsers.

```css
/* square-off the checkboxes and thicken the accent border */
sp-tree::part(checkbox) { border-radius: 0; border-width: 2px; }

/* pill-shaped chips in the select field */
sp-tree-select::part(chip) { border-radius: 999px; }
```

---

## Worked example: dark theme with a custom accent

Three equivalent ways to go dark, then a custom-accent override on top.

**1. Follow the OS.** Nothing to do — the elements already switch under
`@media (prefers-color-scheme: dark)`.

**2. Opt in explicitly** via the `data-theme` attribute (overrides the OS
preference for that element):

```html
<sp-tree data-theme="dark" selection="multi" searchable></sp-tree>
```

**3. Theme a whole region yourself** by setting the dark token values on a
container — and layer a brand accent over the defaults:

```css
.app-dark {
  /* Match the built-in dark palette… */
  --sp-tree-fg: #f3f4f6;
  --sp-tree-fg-muted: #9ca3af;
  --sp-tree-bg: #1f2937;
  --sp-tree-bg-hover: #374151;
  --sp-tree-border: #4b5563;
  --sp-tree-danger: #f87171;
  --sp-tree-chip-bg: #374151;
  --sp-tree-chip-fg: #e5e7eb;
  --sp-tree-panel-bg: #1f2937;
  --sp-tree-panel-shadow: 0 4px 16px rgba(0, 0, 0, .4);

  /* …then override the accent with your brand color. */
  --sp-tree-accent: #a78bfa;      /* violet */
  --sp-tree-accent-fg: #0f172a;
  --sp-tree-focus-ring: 0 0 0 2px var(--sp-tree-accent);
}
```

```html
<div class="app-dark">
  <sp-tree-select selection="multi" searchable placeholder="Pick regions…"></sp-tree-select>
</div>
```

Because `--sp-tree-focus-ring` is defined in terms of `--sp-tree-accent`,
overriding the accent updates the focus ring, checked checkboxes, selected radio,
spinner, and Done button in one line — no part surgery required.
