# Components

The library exposes three components, all exported from `SpTreeviewModule`.

---

## SpTreeviewComponent

**Selector**: `<sp-treeview>`

The main standalone treeview. Renders nodes as an inline expandable list.

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `nodes` | `Node[]` | Yes | Root nodes to display |
| `config` | `Config` | Yes | Tree configuration object |
| `template` | `TemplateRef<SpTreeviewNodeTemplate>` | No | Custom node template |
| `contextPrototype` | `any` | No | Context prototype for custom template |

### Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `change` | `Node[]` | Emitted on any selection change. Payload is the array of currently selected nodes. |
| `delete` | `Node` | Emitted when the delete button is clicked on a node. |
| `addChild` | `Node` | Emitted when the add-child button is clicked on a node. |
| `loadChildren` | `Node` | Emitted when a lazy-load node is expanded for the first time (or every time if `loadOnce` is false). |

### Basic Template

```html
<sp-treeview
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)"
  (delete)="onDelete($event)"
  (addChild)="onAddChild($event)"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview>
```

---

## SpTreeviewDropdownComponent

**Selector**: `<sp-treeview-dropdown>`

Wraps the treeview in a compact dropdown. Selected nodes appear as Material chip tags. The tree appears below the field when toggled.

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `placeholder` | `string` | No | Placeholder text shown in the input field |
| `nodes` | `Node[]` | Yes | Root nodes |
| `config` | `Config` | Yes | Configuration (also accepts `dropdownLevelConfig`) |
| `template` | `TemplateRef<SpTreeviewNodeTemplate>` | No | Custom node template |
| `contextPrototype` | `any` | No | Context prototype for custom template |

### Outputs

Same as `SpTreeviewComponent`: `change`, `delete`, `addChild`, `loadChildren`.

### Basic Template

```html
<sp-treeview-dropdown
  [placeholder]="'Select locations'"
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview-dropdown>
```

### Dropdown-Specific Behavior

- Selected nodes display as removable chips above/beside the input
- Left/right scroll arrows appear when chips overflow
- A "Done" button closes the dropdown
- A transparent cover overlay captures outside clicks to close the dropdown
- Initial open state is controlled by `DropdownLevelConfig.showDropdownDefault`

---

## SpTreeviewOverlayComponent

**Selector**: `<sp-treeview-overlay>`

Similar to the dropdown but presents the tree in a full-screen overlay modal. Suitable for mobile and small-screen use cases.

### Inputs & Outputs

Identical to `SpTreeviewDropdownComponent`.

### Basic Template

```html
<sp-treeview-overlay
  [placeholder]="'Select locations'"
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview-overlay>
```

### Overlay-Specific Behavior

- Treeview height fills `calc(100vh - 125px)`
- Same chip selection UI as the dropdown
- "Done" button dismisses the overlay

---

## SpTreeviewNodeComponent

**Selector**: `<sp-treeview-node>`

Internal recursive component that renders a single node and its children. This component is used internally by `SpTreeviewComponent` and is exported from the module, but direct use is uncommon.

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `node` | `Node` | The node to render |
| `config` | `Config` | Configuration |
| `template` | `TemplateRef<SpTreeviewNodeTemplate>` | Custom node template |
| `contextPrototype` | `any` | Context prototype |

### Outputs

| Output | Payload |
|--------|---------|
| `radioSelect` | `Node[]` |
| `checkboxSelect` | `null` |
| `delete` | `Node` |
| `addChild` | `Node` |
| `loadChildren` | `Node` |

---

## Custom Node Templates

You can supply a custom `ng-template` to replace the default node rendering:

```html
<sp-treeview
  [nodes]="nodes"
  [config]="config"
  [template]="myNodeTemplate"
  [contextPrototype]="myContextProto"
  (change)="onChange($event)">
</sp-treeview>

<ng-template #myNodeTemplate let-ctx>
  <span>{{ ctx.node.name }}</span>
  <em *ngIf="ctx.node.value"> ({{ ctx.node.value }})</em>
</ng-template>
```

The template context exposes `ctx.node` (the `Node` instance) and any extra properties set on `contextPrototype`.

See [Data Models — SpTreeviewNodeTemplateContext](./data-models.md#sptreeviewnodetemplatecontext) for the full context shape.
