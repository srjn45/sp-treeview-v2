# Examples

---

## 1. Basic Checkbox Tree

A simple multi-select tree with pre-loaded data and search.

**Component**:

```typescript
import { Component } from '@angular/core';
import { Node, Config, TreeLevelConfig, SELECT_CHECKBOX } from 'sp-treeview-v2';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent {
  config = new Config(
    new TreeLevelConfig(true, true, SELECT_CHECKBOX, false, false, true)
  );

  nodes: Node[] = [
    new Node('India', 'IN', [
      new Node('Madhya Pradesh', 'MP', [
        new Node('Indore', 'IND'),
        new Node('Bhopal', 'BHO')
      ]),
      new Node('Maharashtra', 'MH', [
        new Node('Mumbai', 'MUM'),
        new Node('Pune', 'PUN')
      ])
    ]),
    new Node('USA', 'US', [
      new Node('California', 'CA', [
        new Node('Los Angeles', 'LA'),
        new Node('San Francisco', 'SF')
      ])
    ])
  ];

  selectedNodes: Node[] = [];

  onChange(nodes: Node[]) {
    this.selectedNodes = nodes;
  }
}
```

**Template**:

```html
<sp-treeview
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)">
</sp-treeview>

<p>Selected: {{ selectedNodes.length }} item(s)</p>
```

---

## 2. Lazy Loading

Nodes with an empty `children` array (`[]`) trigger the `loadChildren` event when expanded.

**Component**:

```typescript
@Component({ ... })
export class LazyComponent {
  config = new Config(
    new TreeLevelConfig(true, true, SELECT_CHECKBOX, false, false, true)
  );

  nodes: Node[] = [
    new Node('Root A', 'a', []),  // [] triggers lazy load
    new Node('Root B', 'b', [])
  ];

  onLoadChildren(node: Node) {
    // node.progress is automatically set to true while loading
    this.apiService.getChildren(node.value).subscribe(data => {
      node.loadChildren(Node.toNodeArray(data));
      // node.progress is automatically cleared after loadChildren()
    });
  }
}
```

**Template**:

```html
<sp-treeview
  [nodes]="nodes"
  [config]="config"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview>
```

> **Tip**: If `loadOnce` is `true` (default), `loadChildren` fires only once per node. Set it to `false` to re-fetch on every expand.

---

## 3. Delete and Add Child

Enables node management directly in the tree.

**Component**:

```typescript
@Component({ ... })
export class ManageComponent {
  config = new Config(
    new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true)
  );

  nodes: Node[] = [ /* ... */ ];

  onDelete(node: Node) {
    if (confirm(`Delete "${node.name}"?`)) {
      this.apiService.delete(node.value).subscribe(() => {
        node.removeMe(); // removes node from the tree
      });
    }
  }

  onAddChild(node: Node) {
    const name = prompt('New child name:');
    if (name) {
      const newNode = new Node(name, Date.now().toString());
      this.apiService.create(node.value, newNode).subscribe(id => {
        newNode.value = id;
        node.addChild(newNode);
      });
    }
  }
}
```

---

## 4. Dropdown Variant

Displays selected items as chips with a collapsible tree panel.

**Component**:

```typescript
import { Config, TreeLevelConfig, DropdownLevelConfig, SELECT_CHECKBOX } from 'sp-treeview-v2';

config = new Config(
  new TreeLevelConfig(true, true, SELECT_CHECKBOX, false, false, true),
  new DropdownLevelConfig('300px', false)  // 300px panel, closed on init
);
```

**Template**:

```html
<sp-treeview-dropdown
  [placeholder]="'Select regions'"
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview-dropdown>
```

---

## 5. Overlay Variant (Mobile-Friendly)

Full-screen overlay instead of a dropdown panel.

**Template**:

```html
<sp-treeview-overlay
  [placeholder]="'Select regions'"
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview-overlay>
```

---

## 6. Radio Select (Single Selection)

Only one node can be selected at a time.

```typescript
import { SELECT_RADIO } from 'sp-treeview-v2';

config = new Config(
  new TreeLevelConfig(true, true, SELECT_RADIO, false, false, true)
);
```

The `change` event payload will contain at most one node.

---

## 7. Per-Node Config Overrides

Disable delete/addChild buttons on specific nodes while keeping them enabled globally.

```typescript
import { NodeLevelConfig } from 'sp-treeview-v2';

nodes: Node[] = [
  // This node cannot be deleted and cannot have children added
  new Node('Protected Root', 'protected', [
    new Node('Child A', 'ca'),
    new Node('Child B', 'cb')
  ], new NodeLevelConfig(false, false)),

  // This node can be deleted but not have children added
  new Node('Removable Node', 'removable', [], new NodeLevelConfig(true, false))
];

config = new Config(
  new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true)
);
```

---

## 8. Custom Node Template

Replace the default node rendering with your own `ng-template`.

**Template**:

```html
<sp-treeview
  [nodes]="nodes"
  [config]="config"
  [template]="customNode"
  (change)="onChange($event)">
</sp-treeview>

<ng-template #customNode let-ctx>
  <div style="display:flex; align-items:center; gap:8px;">
    <mat-icon>{{ ctx.node.children ? 'folder' : 'insert_drive_file' }}</mat-icon>
    <span>{{ ctx.node.name }}</span>
    <span style="color:gray; font-size:12px;">({{ ctx.node.value }})</span>
  </div>
</ng-template>
```

> The template context variable (`let-ctx`) exposes `ctx.node` as the current `Node` instance.

---

## 9. Converting Flat API Data to Nodes

When your API returns flat records with parent references:

```typescript
interface ApiRecord {
  id: string;
  parentId: string | null;
  label: string;
}

function buildTree(records: ApiRecord[]): Node[] {
  const map = new Map<string, Node>();

  records.forEach(r => {
    map.set(r.id, new Node(r.label, r.id, []));
  });

  const roots: Node[] = [];
  records.forEach(r => {
    const node = map.get(r.id)!;
    if (r.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(r.parentId);
      if (parent) parent.children!.push(node);
    }
  });

  return roots;
}

// Usage
this.nodes = buildTree(apiResponse);
```

---

## 10. Getting Selected Values After Initialization

To read the current selection programmatically (not just via the `change` event):

```typescript
// Get all checked nodes across the entire tree
getAllSelected(): Node[] {
  const results: Node[] = [];
  this.nodes.forEach(rootNode => {
    results.push(...rootNode.getCheckedValues());
  });
  return results;
}
```
