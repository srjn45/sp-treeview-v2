import { Component } from '@angular/core';
import { Node, CHECKED, UNCHECKED, INDETERMINATE } from './sp-treeview/model/node';
import { Config, TreeLevelConfig, SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from './sp-treeview/model/config';
import { SpTreeviewNodeTemplateContext } from './sp-treeview/model/sp-treeview-node-template-context';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';

  public SELECT_CHECKBOX = SELECT_CHECKBOX;
  public SELECT_RADIO = SELECT_RADIO;
  public SELECT_NONE = SELECT_NONE;

  public CHECKED = CHECKED;
  public UNCHECKED = UNCHECKED;
  public INDETERMINATE = INDETERMINATE;

  config = new Config(new TreeLevelConfig(true, true, SELECT_CHECKBOX, true, true, true));
  nodes: Node[] = [];

  _dataSource = [
    { parent: '0', node: new Node('India', '91', []) },
    { parent: '91', node: new Node('Madhya Pradesh', 'MP', []) },
    { parent: 'MP', node: new Node('Indore', '731') },
    { parent: 'MP', node: new Node('Bhopal', '755') },
    { parent: '91', node: new Node('Maharashtra', 'MH', []) },
    { parent: 'MH', node: new Node('Mumbai', '22') },
    { parent: 'MH', node: new Node('Pune', '20') },
    { parent: '0', node: new Node('USA', '1', []) },
    { parent: '1', node: new Node('California', 'CA', []) },
    { parent: 'CA', node: new Node('Los Angeles', '310') },
    { parent: 'CA', node: new Node('San Francisco', '415') },
    { parent: '1', node: new Node('Nevada', 'NV', []) },
    { parent: 'NV', node: new Node('Las Vegas', '702') },
    { parent: 'NV', node: new Node('Carson City', '775') },
  ];

  contextPrototype = SpTreeviewNodeTemplateContext.prototype;

  constructor() {
    this.nodes = this._dataSource.filter(d => d.parent === '0').map(d => d.node);
  }

  onLoadChildren(node: Node) {
    setTimeout(() => {
      node.children = this._dataSource.filter(d => d.parent === node.value).map(d => d.node);
    }, 3000);
  }

  onDelete(node: Node) {
    console.log("Delete" + JSON.stringify(node.name));
  }

  onAddChild(node: Node) {
    console.log("AddChild" + JSON.stringify(node.name));
  }

  onChange(nodes: Node[]) {
    console.log(nodes);
  }
}
