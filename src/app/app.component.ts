import { Component } from '@angular/core';
import { Node, NodeState } from './sp-treeview/model/node';
import { Config, TreeLevelConfig, SELECT_CHECKBOX, CHECKED_VALUE_LEAVES, NodeLevelConfig } from './sp-treeview/model/config';
import { timeout } from 'q';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';

  config = new Config(new TreeLevelConfig(true, SELECT_CHECKBOX, CHECKED_VALUE_LEAVES, true, true, true));
  node = new Node("name", 1, [new Node("child", 1, null, false, new NodeState(), new NodeLevelConfig())], false, new NodeState(), new NodeLevelConfig());

  onLoadChildren(node: Node) {
    setTimeout(() => {
      node.children = [new Node("child1", 1, null, false, new NodeState(), new NodeLevelConfig()),
      new Node("child2", 2, null, false, new NodeState(), new NodeLevelConfig())];
    }, 3000);
  }

  onDelete(node: Node) {
    console.log("Delete" + JSON.stringify(node));
  }

  onAddChild(node: Node) {
    console.log("AddChild" + JSON.stringify(node));
  }

}
