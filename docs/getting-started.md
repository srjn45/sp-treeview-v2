# Getting Started

## Installation

```bash
npm install sp-treeview-v2 --save
```

## Peer Dependencies

The library requires Angular Material and CDK (v5.x):

```bash
npm install @angular/material @angular/cdk --save
```

Add Material Icons to your `index.html`:

```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

Include a Material theme in your `styles.css`:

```css
@import "~@angular/material/prebuilt-themes/indigo-pink.css";
```

---

## Module Setup

Import `SpTreeviewModule` and `BrowserAnimationsModule` into your root module:

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { SpTreeviewModule } from 'sp-treeview-v2';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    SpTreeviewModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## Basic Usage

### 1. Import models in your component

```typescript
import { Component } from '@angular/core';
import {
  Node,
  Config,
  TreeLevelConfig,
  SELECT_CHECKBOX
} from 'sp-treeview-v2';
```

### 2. Create nodes and config

```typescript
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  config = new Config(
    new TreeLevelConfig(
      true,            // loadOnce
      true,            // allNode (show "All" root toggle)
      SELECT_CHECKBOX, // selection mode
      false,           // deleteNode
      false,           // addChild
      true             // search
    )
  );

  nodes: Node[] = [
    new Node('India', '91', [
      new Node('Madhya Pradesh', 'MP', [
        new Node('Indore', '731'),
        new Node('Bhopal', '755')
      ]),
      new Node('Maharashtra', 'MH', []) // [] = lazy load children
    ]),
    new Node('USA', '1', [])            // [] = lazy load children
  ];

  onChange(nodes: Node[]) {
    console.log('Selected nodes:', nodes);
  }

  onLoadChildren(node: Node) {
    // Simulate async fetch
    setTimeout(() => {
      node.loadChildren([
        new Node('Child A', 'ca'),
        new Node('Child B', 'cb')
      ]);
    }, 1000);
  }
}
```

### 3. Add to template

```html
<sp-treeview
  [nodes]="nodes"
  [config]="config"
  (change)="onChange($event)"
  (loadChildren)="onLoadChildren($event)">
</sp-treeview>
```

---

## Node Children Conventions

The `children` field on a `Node` controls its behavior:

| Value | Behavior |
|-------|----------|
| `undefined` / `null` | Leaf node — no expand toggle |
| `[]` (empty array) | Lazy-load node — triggers `loadChildren` event on expand |
| `[...nodes]` | Pre-loaded children — rendered immediately |

---

## Next Steps

- See [Components](./components.md) for full API reference
- See [Configuration](./configuration.md) for all config options
- See [Examples](./examples.md) for advanced usage patterns
