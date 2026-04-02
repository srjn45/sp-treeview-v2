import { Component } from '@angular/core';
import { Node } from './sp-treeview/model/node';
import { Config } from './sp-treeview/model/config';
import { TreeLevelConfig, SELECT_CHECKBOX } from './sp-treeview/model/tree-level-config';
import { DropdownLevelConfig } from './sp-treeview/model/dropdown-level-config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false,
})
export class AppComponent {

  configDropdown = new Config(
    new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true),
    new DropdownLevelConfig('250px')
  );
  configOverlay = new Config(
    new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true)
  );
  config = new Config(
    new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true)
  );

  private _dataSource = [
    { parent: '0',  node: new Node('India', '91', []) },
    { parent: '91', node: new Node('Madhya Pradesh', 'MP', []) },
    { parent: 'MP', node: new Node('Indore', '731') },
    { parent: 'MP', node: new Node('Bhopal', '755') },
    { parent: '91', node: new Node('Maharashtra', 'MH', []) },
    { parent: 'MH', node: new Node('Mumbai', '22') },
    { parent: 'MH', node: new Node('Pune', '20') },
    { parent: '0',  node: new Node('USA', '1', []) },
    { parent: '1',  node: new Node('California', 'CA', []) },
    { parent: 'CA', node: new Node('Los Angeles', '310') },
    { parent: 'CA', node: new Node('San Francisco', '415') },
    { parent: '1',  node: new Node('Nevada', 'NV', []) },
    { parent: 'NV', node: new Node('Las Vegas', '702') },
    { parent: 'NV', node: new Node('Carson City', '775') },
  ];

  nodes: Node[] = Node.toNodeArray(
    this._dataSource.filter(d => d.parent === '0').map(d => d.node)
  );

  onLoadChildren(node: Node) {
    setTimeout(() => {
      node.loadChildren(
        Node.toNodeArray(
          this._dataSource.filter(d => d.parent === node.value).map(d => d.node)
        )
      );
    }, 1000);
  }

  onDelete(node: Node) {
    node.removeMe();
  }

  onAddChild(node: Node) {
    const name = prompt(`Add child to "${node.name}":`);
    if (name) {
      node.addChild(new Node(name, `${node.value}-${Date.now()}`));
    }
  }

  onChange(nodes: Node[]) {
    console.log('Selected:', nodes.map(n => n.name));
  }
}
