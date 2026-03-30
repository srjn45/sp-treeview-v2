# Configuration Reference

---

## Quick Reference

```typescript
const config = new Config(
  new TreeLevelConfig(
    loadOnce,    // boolean  — reload children on each expand?
    allNode,     // boolean  — show "All" root toggle?
    select,      // number   — SELECT_NONE | SELECT_CHECKBOX | SELECT_RADIO
    deleteNode,  // boolean  — show delete buttons?
    addChild,    // boolean  — show add-child buttons?
    search       // boolean  — show search input?
  ),
  new DropdownLevelConfig(
    height,              // string  — panel height (e.g. '300px')
    showDropdownDefault  // boolean — open on init?
  )
);
```

---

## TreeLevelConfig Options

### `loadOnce: boolean` (default: `true`)

Controls whether lazy-loaded children are fetched once or re-fetched every time the node is expanded.

- `true` — The `loadChildren` event fires only on the first expand. Subsequent expands show cached children.
- `false` — The `loadChildren` event fires every time the node is expanded, clearing previously loaded children each time.

```typescript
// Re-fetch children on every expand (live data)
new TreeLevelConfig(false, ...)
```

---

### `allNode: boolean` (default: `true`)

When `true`, renders a special "All" row above the root nodes:

- In `SELECT_CHECKBOX` mode: a checkbox that selects/deselects all root nodes and their descendants.
- In `SELECT_RADIO` mode: a radio button that represents the "no selection / all" state.
- In `SELECT_NONE` mode: a plain label.

```typescript
// Hide the "All" row
new TreeLevelConfig(true, false, ...)
```

---

### `select: SELECT_NONE | SELECT_CHECKBOX | SELECT_RADIO` (default: `SELECT_NONE`)

Sets the selection mode for the entire tree.

| Constant | Value | Behavior |
|----------|-------|----------|
| `SELECT_NONE` | `0` | No selection controls. Tree is display-only. |
| `SELECT_CHECKBOX` | `1` | Checkboxes on every node. Parent has indeterminate state when only some children are selected. |
| `SELECT_RADIO` | `2` | Radio buttons on every node. Only one node can be selected at a time. |

The `change` output emits whenever the selection changes, regardless of mode.

---

### `deleteNode: boolean` (default: `false`)

When `true`, shows a delete (trash) icon button on every node. Clicking it emits the `delete` output event with the target node.

Use `NodeLevelConfig` to override this per node:

```typescript
// Enable delete on tree, but disable on the root node
const rootNode = new Node('Root', 'root', [...], new NodeLevelConfig(false));
const config = new Config(new TreeLevelConfig(true, true, SELECT_CHECKBOX, true));
```

---

### `addChild: boolean` (default: `false`)

When `true`, shows an add-child (plus) icon button on every node. Clicking it emits the `addChild` output event with the target node.

Override per node with `NodeLevelConfig`:

```typescript
// Allow adding children only to branch nodes, not leaves
const leaf = new Node('Leaf', 'l', undefined, new NodeLevelConfig(undefined, false));
```

---

### `search: boolean` (default: `true`)

When `true`, renders a search input above the tree. As the user types, nodes whose names don't match the query (case-insensitive substring) are hidden. Ancestors of matching nodes remain visible.

```typescript
// Disable search
new TreeLevelConfig(true, true, SELECT_NONE, false, false, false)
```

---

## DropdownLevelConfig Options

Only applies to `SpTreeviewDropdownComponent` and `SpTreeviewOverlayComponent`.

### `height: string` (default: `'auto'`)

CSS height value for the treeview panel inside the dropdown. Use any valid CSS unit:

```typescript
new DropdownLevelConfig('300px')   // fixed pixel height
new DropdownLevelConfig('50vh')    // relative to viewport
new DropdownLevelConfig('auto')    // grow with content
```

---

### `showDropdownDefault: boolean` (default: `false`)

When `true`, the dropdown/overlay panel is open when the component renders. Useful for pages where immediate tree access is expected.

```typescript
new DropdownLevelConfig('300px', true) // open on load
```

---

## NodeLevelConfig Options

Passed as the fourth argument to the `Node` constructor. Overrides `TreeLevelConfig` values for a specific node only.

| Property | Effect |
|----------|--------|
| `deleteNode: true` | Force-show delete button on this node, even if `treeLevelConfig.deleteNode` is `false` |
| `deleteNode: false` | Force-hide delete button on this node, even if `treeLevelConfig.deleteNode` is `true` |
| `deleteNode: undefined` | Inherit from `treeLevelConfig.deleteNode` (default) |
| `addChild: true/false/undefined` | Same logic as above, for the add-child button |

```typescript
const protectedNode = new Node(
  'System Root',
  'sys',
  [...children],
  new NodeLevelConfig(false, false) // no delete, no addChild
);
```

---

## Common Config Recipes

### Read-only tree, no selection

```typescript
new Config(
  new TreeLevelConfig(true, false, SELECT_NONE, false, false, false)
)
```

### Multi-select with search

```typescript
new Config(
  new TreeLevelConfig(true, true, SELECT_CHECKBOX, false, false, true)
)
```

### Single-select dropdown, fixed height

```typescript
new Config(
  new TreeLevelConfig(true, true, SELECT_RADIO, false, false, true),
  new DropdownLevelConfig('250px', false)
)
```

### Full management tree (delete + add + search)

```typescript
new Config(
  new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true)
)
```

### Live data (reload children on every expand)

```typescript
new Config(
  new TreeLevelConfig(false, true, SELECT_CHECKBOX, false, false, true)
)
```
