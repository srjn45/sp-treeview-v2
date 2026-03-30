# Data Models

All models are exported from `sp-treeview-v2` and should be imported directly.

```typescript
import {
  Node, NodeState,
  Config, TreeLevelConfig, DropdownLevelConfig, NodeLevelConfig,
  SpTreeviewNodeTemplate, SpTreeviewNodeTemplateContext,
  SELECT_NONE, SELECT_CHECKBOX, SELECT_RADIO,
  CHECKED, UNCHECKED, INDETERMINATE
} from 'sp-treeview-v2';
```

---

## Node

The fundamental data unit. Every item in the tree is a `Node` instance.

### Constructor

```typescript
new Node(name: string, value: any, children?: Node[], nodeLevelConfig?: NodeLevelConfig)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Display label shown in the tree |
| `value` | `any` | Unique identifier (used in selection events) |
| `children` | `Node[]` | Child nodes. `undefined`/`null` = leaf, `[]` = lazy-load, `[...nodes]` = pre-loaded |
| `nodeLevelConfig` | `NodeLevelConfig` | Optional per-node config overrides |

### Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display text |
| `value` | `any` | Identifier |
| `children` | `Node[]` | Child nodes array |
| `progress` | `boolean` | `true` while children are loading |
| `nodeState` | `NodeState` | Selection and visibility state |
| `nodeLevelConfig` | `NodeLevelConfig` | Per-node configuration overrides |
| `parent` | `Node` | Reference to the parent node (set internally) |
| `config` | `Config` | Reference to the tree config (set internally) |

### Instance Methods

#### `loadChildren(children: Node[]): void`
Call this inside your `loadChildren` event handler to inject lazy-loaded children into the node.

```typescript
onLoadChildren(node: Node) {
  fetchFromApi(node.value).subscribe(data => {
    node.loadChildren(Node.toNodeArray(data));
  });
}
```

#### `addChild(child: Node): void`
Append a new child node at runtime.

```typescript
onAddChild(node: Node) {
  node.addChild(new Node('New Item', generateId()));
}
```

#### `removeMe(): void`
Remove this node from its parent's children array.

```typescript
onDelete(node: Node) {
  deleteFromApi(node.value).subscribe(() => node.removeMe());
}
```

#### `getCheckedValues(): Node[]`
Recursively collect all `CHECKED` nodes in this subtree.

#### `filter(text: string, loadChildren: EventEmitter<Node>): boolean`
Recursively filter this node and its descendants by display name. Used internally by the search feature.

#### `setCheckedRecursively(checked: number): void`
Set `CHECKED` or `UNCHECKED` state on this node and all its descendants.

#### `changeChildrenRecursive(): void`
Propagate the current node's check state down to all children. Called after a parent checkbox changes.

#### `checkImmediateChildren(): void`
Re-evaluate this node's state (`CHECKED`, `UNCHECKED`, or `INDETERMINATE`) based on the states of its direct children. Called after a child checkbox changes.

### Static Methods

#### `Node.nodify(obj: object): Node`
Convert a plain object with `name`, `value`, and optional `children` into a `Node` instance recursively.

```typescript
const node = Node.nodify({ name: 'India', value: '91', children: [
  { name: 'Delhi', value: 'DL' }
]});
```

#### `Node.toNodeArray(array: object[]): Node[]`
Convert an array of plain objects into an array of `Node` instances.

```typescript
const nodes = Node.toNodeArray(apiResponse);
```

---

## NodeState

Tracks the visual/interactive state of a node.

### Constants

```typescript
export const CHECKED      =  1;
export const UNCHECKED    =  0;
export const INDETERMINATE = -1;
```

### Constructor

```typescript
new NodeState(checked?: number, collapsed?: boolean, disabled?: boolean, hidden?: boolean)
```

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `checked` | `CHECKED \| UNCHECKED \| INDETERMINATE` | `UNCHECKED` | Selection state |
| `collapsed` | `boolean` | `true` | Whether the node's children are collapsed |
| `disabled` | `boolean` | `false` | Prevents selection interaction |
| `hidden` | `boolean` | `false` | Used by search to hide non-matching nodes |

---

## Config

Container that groups all configuration objects.

### Constructor

```typescript
new Config(treeLevelConfig?: TreeLevelConfig, dropdownLevelConfig?: DropdownLevelConfig)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `treeLevelConfig` | `TreeLevelConfig` | Tree-wide behavior settings |
| `dropdownLevelConfig` | `DropdownLevelConfig` | Dropdown/overlay-specific settings |

---

## TreeLevelConfig

Controls tree-wide behavior.

### Selection Mode Constants

```typescript
export const SELECT_NONE     = 0; // Display only, no selection UI
export const SELECT_CHECKBOX = 1; // Multi-select with checkboxes
export const SELECT_RADIO    = 2; // Single-select with radio buttons
```

### Constructor

```typescript
new TreeLevelConfig(
  loadOnce?: boolean,
  allNode?: boolean,
  select?: number,
  deleteNode?: boolean,
  addChild?: boolean,
  search?: boolean
)
```

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `loadOnce` | `boolean` | `true` | If `true`, lazy children are loaded only once. If `false`, they reload every time the node is expanded. |
| `allNode` | `boolean` | `true` | Show an "All" toggle at the root level (above the first tier of nodes) |
| `select` | `SELECT_NONE \| SELECT_CHECKBOX \| SELECT_RADIO` | `SELECT_NONE` | Selection mode for the entire tree |
| `deleteNode` | `boolean` | `false` | Show delete button on nodes |
| `addChild` | `boolean` | `false` | Show add-child button on nodes |
| `search` | `boolean` | `true` | Show search input above the tree |

> **Internal properties** (`progress`, `searchStr`, `treeview`, `loadChildrenStack`) are managed by the library and should not be set manually.

---

## DropdownLevelConfig

Settings specific to `SpTreeviewDropdownComponent` and `SpTreeviewOverlayComponent`.

### Constructor

```typescript
new DropdownLevelConfig(height?: string, showDropdownDefault?: boolean)
```

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `height` | `string` | `'auto'` | CSS height of the treeview panel inside the dropdown (e.g., `'300px'`, `'50vh'`) |
| `showDropdownDefault` | `boolean` | `false` | If `true`, the dropdown/overlay is open when the component initializes |

---

## NodeLevelConfig

Per-node overrides for tree-level settings. Pass as the fourth argument to the `Node` constructor.

### Constructor

```typescript
new NodeLevelConfig(deleteNode?: boolean, addChild?: boolean)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `deleteNode` | `boolean \| undefined` | Override the tree's `deleteNode` setting for this specific node |
| `addChild` | `boolean \| undefined` | Override the tree's `addChild` setting for this specific node |

```typescript
// Show delete only on leaf nodes
const leaf = new Node('Indore', '731', undefined, new NodeLevelConfig(true, false));
```

---

## SpTreeviewNodeTemplate

Interface that describes the shape of the custom template context object.

```typescript
interface SpTreeviewNodeTemplate {
  node: Node;
  [key: string]: any;
}
```

---

## SpTreeviewNodeTemplateContext

Concrete implementation of `SpTreeviewNodeTemplate` used as the `$implicit` context in custom `ng-template` definitions.

```html
<ng-template #myTemplate let-ctx>
  <!-- ctx is a SpTreeviewNodeTemplateContext -->
  <strong>{{ ctx.node.name }}</strong>
</ng-template>
```
