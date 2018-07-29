# sp-treeview-v2
An angular (2/4/5) plugin to display treeview

## Features
- Tree view with infinite levels
- lazy loading (load once/always)
- treeview input field with dropdown/overlay
- single-select node with radio button
- multi-select nodes with checkbox
- delete node
- add child node
- search the tree

## Installation

To install this library, run:

```bash
$ npm install sp-treeview-v2 --save
```

## Consuming your library

Add it in your `AppModule`:

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

// Import SpTreeviewModule
import { SpTreeviewModule } from 'sp-treeview-v2';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,

    // Specify SpTreeviewModule as an import
    SpTreeviewModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

Once sp-treeview-v2 is imported, you can use its components in your Angular application:

```xml
<!-- You can now use your library component in app.component.html -->
<h1>
  {{title}}
</h1>

<sp-treeview [nodes]="nodes" [config]="config" (change)="onChange($event)" (delete)="onDelete($event)" (addChild)="onAddChild($event)" (loadChildren)="onLoadChildren($event)"></sp-treeview>

or

<sp-treeview-dropdown [placeholder]="'placeholder'" [nodes]="nodes" [config]="config" (delete)="onDelete($event)" (addChild)="onAddChild($event)" (loadChildren)="onLoadChildren($event)" (change)="onChange($event)"></sp-treeview-dropdown>

or

<sp-treeview-overlay [placeholder]="'placeholder'" [nodes]="nodes" [config]="config" (delete)="onDelete($event)" (addChild)="onAddChild($event)" (loadChildren)="onLoadChildren($event)" (change)="onChange($event)"></sp-treeview-overlay>

```

## Usage

- sp-treeview/sp-treeview-dropdown/sp-treeview-overlay takes Node[] and Config as input
- change event is fired on selection change in case of radio button/checkbox selection, delete and addChild event also fire change event
- delete event is fired when a node is deleted
- addChild event is fired to create a child of node
- loadChildren event is fired everytime(loadOnce=false)/first time(loadonce=true) on click of expand/collapse button
- expand/collapse button is visible only if children is not null. If the node have children that can be loaded later then set empty array in children. A node with null value in children is treated as a leaf node.

## Node

Tree is consist of nodes, each node contains

- name: string - display text
- value: any - id or object that uniquily identifies the node
- children?: Node[]- list of child nodes (null->leaf node, []->lazy load, [node,node,...]-> expand(loadOnce=true) || lazy load(loadOnce=false))
- progress = false - shows indeterminate progress while loading children 
- nodeState = new NodeState() - contains the state of node
- nodeLevelConfig = new NodeLevelConfig() - overrides the tree level config

following properties are handled internally

- parent: Node = null - holds the reference to the parent node
- config: Config - holds reference to the config object for the tree
- loadChildrenEvent: EventEmitter<Node> - holds the reference to the loadChildren event to load child nodes while searching the tree

## NodeState

- checked = UNCHECKED - checked state(CHECKED/UNCHECKED/INDETERMINATE)
- collapsed = true - node is expanded(false) or collapsed(true)
- disabled = false - checkbox/radio is disabled or not
- hidden = false - show/hide node

## NodeLevelConfig

- deleteNode?: boolean - if null then use tree level config otherwise use this config
- addChild?: boolean - if null then use tree level config otherwise use this config

## Config

Config is used to show/hide template elements or change functionality

- treeLevelConfig = new TreeLevelConfig() - contains config related to treeview
- dropdownLevelConfig = new DropdownLevelConfig() - contains config related to dropdown

## TreeLevelConfig

- loadOnce = true - load children once or always on expand/collapse
- allNode = true - show/hide all node
- select = SELECT_NONE - (SELECT_NONE/SELECT_RADIO/SELECT_CHECKBOX) what selection method to display
- deleteNode = false - show/hide delete node button
- addChild = false - show/hide add child button
- search = true - show/hide search bar

following properties are handled internally

- progress = false - show/hide search bar progress
- searchStr = '' - stores the search term
- treeview: SpTreeviewComponent - holds reference to treeview component
- loadChildrenStack = [] - keeps record of awaited loadChildren response

## DropdownLevelConfig

- height = 'auto' - hieght of the treeview in dropdown
- showDropdownDefault = false - show/hide dropdown by default

## License

MIT © [srjn45](mailto:srajanpathak45@gmail.com)