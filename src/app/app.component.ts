import { Component } from '@angular/core';
import { Node, NodeState, CHECKED, UNCHECKED, INDETERMINATE } from './sp-treeview/model/node';
import { Config, TreeLevelConfig, SELECT_CHECKBOX, NodeLevelConfig, SELECT_RADIO, SELECT_NONE } from './sp-treeview/model/config';
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

  config = new Config(new TreeLevelConfig(true, SELECT_CHECKBOX, true, true, true));
  nodes = [
    new Node("name", 1, [new Node("child", 11, null, false, new NodeState(), new NodeLevelConfig())], false, new NodeState(), new NodeLevelConfig()),
    new Node("name", 2, [new Node("child", 21, null, false, new NodeState(), new NodeLevelConfig())], false, new NodeState(), new NodeLevelConfig())
  ];
  contextPrototype = SpTreeviewNodeTemplateContext.prototype;

  onLoadChildren(node: Node) {
    setTimeout(() => {
      node.children = [new Node("child1", 31, null, false, new NodeState(), new NodeLevelConfig()),
      new Node("child2", 32, null, false, new NodeState(), new NodeLevelConfig())];
    }, 3000);
  }

  onDelete(node: Node) {
    console.log("Delete" + JSON.stringify(node));
  }

  onAddChild(node: Node) {
    console.log("AddChild" + JSON.stringify(node));
  }

  onChange(nodes: Node[]) {
    console.log(nodes);
  }

}
