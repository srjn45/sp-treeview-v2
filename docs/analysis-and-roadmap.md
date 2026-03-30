# Analysis & Modernisation Roadmap

> Baseline: Angular 5.2 / Material 5.2 / TypeScript 2.5
> Target: Angular 19 / Material 19 / TypeScript 5.x

---

## 1. Active Bugs

These are broken right now, independent of any Angular version.

### B-1 — `getSelectedValues()` always throws
**File**: `sp-treeview.component.ts:50`
```typescript
// values is declared but never initialized — push() will throw
let values: Node[];
this.nodes.forEach(n => n.getCheckedValues().forEach(v => values.push(v)));
```
Should be `let values: Node[] = [];`

### B-2 — Removing a chip toggles the dropdown open/closed
**Files**: `sp-treeview-dropdown.component.ts:70`, `sp-treeview-overlay.component.ts:69`
```typescript
remove(node: Node): void {
  this.dropDown = !this.dropDown;  // BUG: toggles instead of keeping state unchanged
  ...
}
```

### B-3 — Search only matches prefix, not substring
**File**: `node.ts:222`
```typescript
if (this.name.toLowerCase().startsWith(text.toLowerCase())) {  // documented as substring
```
All documentation describes substring matching, but the code uses `startsWith`.

### B-4 — `node.name.replace(' ', '&nbsp;')` only replaces first space
**File**: `sp-treeview-dropdown.component.html:12`
```html
{{ node.name.replace(' ',"&nbsp;") }}
```
`String.prototype.replace` with a string argument replaces only the first match.
Should be a regex: `replace(/ /g, '\u00A0')` or handled in a pipe.

### B-5 — Search triggers `loadChildren` on lazy nodes during filter
**File**: `node.ts:231–233`
When search runs over a node with `children.length === 0`, it immediately emits `loadChildren`. If the user types fast, this fires multiple API requests per node. There is no debounce and no guard against duplicate in-flight requests.

---

## 2. Angular Version Breaking Changes

Moving from Angular 5 → 19 requires fixing every item below before the library compiles.

### A-1 — Material barrel imports removed (Angular 9+)
```typescript
// BROKEN in Angular 9+
import { MatCheckboxModule, MatRadioModule, ... } from '@angular/material';
import { MatCheckboxChange, MatRadioChange }      from '@angular/material';

// CORRECT
import { MatCheckboxModule }  from '@angular/material/checkbox';
import { MatCheckboxChange }  from '@angular/material/checkbox';
import { MatRadioModule }     from '@angular/material/radio';
// ... one sub-package per component
```
This affects: `sp-treeview.module.ts`, `sp-treeview.component.ts`, `sp-treeview-node-template-context.ts`.

### A-2 — `BrowserAnimationsModule` must not be in a library module
A library importing `BrowserAnimationsModule` breaks any consumer app that also imports it (double-import error). Libraries should use `NoopAnimationsModule` in tests and let the consuming app provide animations via `provideAnimations()`.

### A-3 — `event.srcElement` removed
**File**: `sp-treeview.component.ts:56`
```typescript
let str = (<HTMLInputElement>event.srcElement).value;  // deprecated, removed in modern browsers
// CORRECT
let str = (event.target as HTMLInputElement).value;
```

### A-4 — `@ViewChild` requires `{ static }` flag (Angular 8+)
```typescript
// Angular 8+ requires explicit static flag
@ViewChild('chipList')                                // BROKEN
@ViewChild('chipList', { static: true })             // CORRECT for ngOnInit access
@ViewChild(SpTreeviewComponent, { static: false })   // CORRECT for ngAfterViewInit access
```

### A-5 — `MatChipList` replaced by `MatChipListbox` / `MatChipGrid` (Material 15+)
`MatChipListModule` and the `<mat-chip-list>` / `<mat-chip>` API were redesigned in Material 15.
- `<mat-chip-list>` → `<mat-chip-listbox>` (selection) or `<mat-chip-grid>` (input)
- `<mat-chip>` → `<mat-chip-option>` or `<mat-chip-row>`
- The entire dropdown/overlay template needs rewriting.

### A-6 — `MatButtonModule` API change
`mat-button mat-icon-button` double-directive syntax was removed. Use `mat-icon-button` alone.

### A-7 — `MatFormField` requires explicit `appearance`
Since Material 15, the default appearance changed. Explicit `appearance="outline"` or `"fill"` is required.

---

## 3. Architecture & Design Problems

These don't crash the app but make the library fragile and hard to maintain.

### D-1 — `TreeLevelConfig` holds a reference to a component (circular coupling)
**File**: `tree-level-config.ts:12`
```typescript
private _treeview: SpTreeviewComponent;  // a config object knowing about a UI component
```
This is used so `Node.removeMe()` can reach `SpTreeviewComponent.nodes` to delete a root node.
**Problem**: Config → Component → Config is a circular dependency. It also prevents the config from being used in any context other than that one component.
**Fix**: Raise a `delete` event from the node. The component listens and removes the node from its own list.

### D-2 — `Node.removeMe()` directly mutates component state
**File**: `node.ts:283–285`
```typescript
// A data model should never directly modify a component
this.config.treeLevelConfig.treeview.nodes = this.config.treeLevelConfig.treeview.nodes.filter(...);
```
**Fix**: Use an event/observable. The component filters its own `nodes` array when it receives the delete event.

### D-3 — `Node` imports `EventEmitter` from `@angular/core`
**File**: `node.ts:2`
```typescript
import { EventEmitter } from '@angular/core';
```
Data models must not depend on the Angular framework. This prevents the model from being used outside Angular (unit tests with plain TS, SSR, etc.).
**Fix**: Store the emitter as a simple callback or inject it differently; or refactor so Node never needs to fire Angular events.

### D-4 — `SpTreeviewNodeTemplateContext` imports Material types
**File**: `sp-treeview-node-template-context.ts:5`
```typescript
import { MatRadioChange, MatCheckboxChange } from '@angular/material';
```
A template context class embedding Material event types means you cannot swap out the Material components without touching the context class.
**Fix**: Handle the unwrapping inside the component and pass primitives (the `Node` itself, or a boolean) to the context handlers.

### D-5 — `Object.setPrototypeOf` used as a constructor substitute
**File**: `node.ts:17`
```typescript
const node: Node = Object.setPrototypeOf(obj, Node.prototype);
```
This is fragile (breaks with frozen/sealed objects, incompatible with TypeScript strict mode, confuses tree-shakers and minifiers) and only exists to avoid writing a proper deserialization function.
**Fix**: A static `Node.fromJson(obj)` factory that creates a real `new Node(...)`.

### D-6 — All config/model classes have trivial private-field + get/set boilerplate
Every property in `NodeState`, `TreeLevelConfig`, `DropdownLevelConfig`, `Config`, `NodeLevelConfig` follows this pattern:
```typescript
private _foo = defaultValue;
get foo() { return this._foo; }
set foo(v) { this._foo = v; }
```
None of these setters/getters add any logic. This is ~200 lines of noise.
**Fix**: Use plain `public` properties (or TypeScript `readonly` where mutation should be prevented).

### D-7 — Config is propagated into every node via `setConfigRecursively`
Every node holds a reference to the shared `Config` object. This is used to reach `treeLevelConfig.searchStr` and `treeLevelConfig.treeview`. It creates hidden global-state coupling: changing config after init has unpredictable effects.
**Fix**: Pass only what nodes actually need (the search string, the load-once flag) as method arguments, not as a permanent back-reference.

### D-8 — `loadChildrenStack` progress management is fragile
**File**: `tree-level-config.ts:103–117`
A push/pop stack is used to track in-flight requests. Two `console.log` statements were left in. If any `loadChildren` callback throws before calling `node.loadChildren()`, the stack never pops and the progress bar never stops.
**Fix**: Track pending loads with a `Set<Node>` keyed by node identity. Use `finalize()` from RxJS in the consuming code to guarantee cleanup.

### D-9 — No `ChangeDetectionStrategy.OnPush`
All four components use default change detection. For a tree with 1 000+ nodes, every mouse move in the host app triggers a full tree re-check.

### D-10 — No `trackBy` in `*ngFor`
```html
<sp-treeview-node *ngFor="let node of nodes">
```
Without `trackBy`, Angular re-creates every DOM node in the list whenever the `nodes` reference changes (e.g. after search).

### D-11 — `<link>` tags inside component templates
**Files**: `sp-treeview.component.html:47`, `sp-treeview-dropdown.component.html:1`
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```
Component templates should not contain `<link>` tags. These create duplicate network requests every time the component is instantiated, and they appear inside the component shadow (or just pollute the DOM). They belong in `index.html` or global `styles.css`.

### D-12 — Direct access to Material internals
**Files**: `sp-treeview-dropdown.component.ts:55`, `sp-treeview-overlay.component.ts:54`
```typescript
this.chipsDiv = this.chipList._elementRef.nativeElement.children[0];
```
`_elementRef` is a private Angular CDK property. It changes without notice between Material versions. The chip scrolling should be implemented via `ElementRef` obtained directly from `@ViewChild`, not via a Material component's private API.

---

## 4. Missing Modern Angular Features

| Feature | Available since | Benefit |
|---------|----------------|---------|
| Standalone components | Angular 14 | No `NgModule` required; tree-shakeable; simpler consumer setup |
| `input()` / `output()` signals | Angular 17 | Reactive inputs, better SSR, no zone.js dependency |
| `ChangeDetectionStrategy.OnPush` | Angular 2 | Essential for performance in large trees |
| `inject()` function | Angular 14 | Cleaner DI without constructor bloat |
| `provideAnimations()` / `provideNoopAnimations()` | Angular 15 | Replaces `BrowserAnimationsModule` in standalone setup |
| `@let` template syntax | Angular 18 | Cleaner templates, avoids `*ngIf as` tricks |
| Typed reactive forms | Angular 14 | If a form is ever added for add-child |
| `takeUntilDestroyed()` | Angular 16 | Automatic subscription cleanup |
| `DestroyRef` | Angular 16 | Lifecycle hook replacement |

---

## 5. Summary: What to Do

### Phase 1 — Bug fixes (no restructuring, just correctness)
1. Fix the uninitialized `values` array in `getSelectedValues()`
2. Fix the `dropDown` toggle bug in `remove()`
3. Change `startsWith` to `includes` for search
4. Fix `replace` to use a global regex
5. Add debounce (300 ms) on the search input
6. Remove all `console.log` calls
7. Replace `event.srcElement` with `event.target`

### Phase 2 — Angular 19 compatibility (required to compile)
1. Split all `@angular/material` imports into individual sub-packages
2. Remove `BrowserAnimationsModule` from `SpTreeviewModule`; document that consumers must add `provideAnimations()`
3. Add `{ static: true/false }` to all `@ViewChild` decorators
4. Rewrite the dropdown/overlay chip area to use the new `MatChipListbox` API
5. Fix the `MatFormField` appearance

### Phase 3 — Architecture refactor (design quality)
1. **Break the circular dependency**: remove `treeview` reference from `TreeLevelConfig`
2. **Fix `Node.removeMe()`**: raise an event instead of touching the component directly
3. **Remove Angular/Material imports from models**: `Node`, `NodeState`, `Config`, `SpTreeviewNodeTemplateContext` should have zero framework imports
4. **Replace `Object.setPrototypeOf`** with a proper `Node.fromJson()` factory
5. **Replace trivial get/set boilerplate** with plain public properties
6. **Replace the `loadChildrenStack`** with a `Set<Node>` and proper RxJS cleanup

### Phase 4 — Modern Angular patterns (quality-of-life)
1. Convert all components to **standalone**
2. Add `ChangeDetectionStrategy.OnPush` to all components
3. Add `trackBy` to every `*ngFor`
4. Migrate `@Input()` / `@Output()` to **signal-based** `input()` / `output()`
5. Move `<link>` tags to consumer's `index.html`; document this as a peer requirement
6. Fix chip scrolling to not use Material private APIs

---

## 6. Recommended New Directory Structure

```
projects/
└── sp-treeview/               ← Angular library (ng-packagr)
    ├── src/
    │   ├── lib/
    │   │   ├── models/
    │   │   │   ├── node.model.ts
    │   │   │   ├── node-state.model.ts
    │   │   │   ├── tree-config.model.ts     ← renamed from TreeLevelConfig
    │   │   │   ├── dropdown-config.model.ts
    │   │   │   └── node-config.model.ts
    │   │   ├── components/
    │   │   │   ├── treeview/
    │   │   │   │   ├── treeview.component.ts
    │   │   │   │   ├── treeview.component.html
    │   │   │   │   └── treeview.component.css
    │   │   │   ├── treeview-node/
    │   │   │   │   ├── treeview-node.component.ts
    │   │   │   │   ├── treeview-node.component.html
    │   │   │   │   └── treeview-node.component.css
    │   │   │   ├── treeview-dropdown/
    │   │   │   └── treeview-overlay/
    │   │   └── index.ts                     ← public API barrel
    │   └── public-api.ts
    ├── ng-package.json
    └── package.json

src/                           ← demo / sandbox app (separate from library)
    └── app/
        └── demo/
```

Key changes from current layout:
- Library code lives under `projects/sp-treeview/` (standard Angular workspace convention)
- Models are in a `models/` subfolder, not mixed with component folders
- A single `index.ts` barrel inside `lib/` keeps the public API tidy
- The demo app is clearly separate from the library source
