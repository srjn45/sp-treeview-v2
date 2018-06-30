import { Component, OnInit, Input, Output, TemplateRef, EventEmitter } from '@angular/core';
import { Config, SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from '../model/config';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { Node, CHECKED, INDETERMINATE } from '../model/node';
import { MatRadioChange, MatCheckboxChange } from '@angular/material';

@Component({
  selector: 'sp-treeview-node',
  templateUrl: './sp-treeview-node.component.html',
  styleUrls: ['./sp-treeview-node.component.css']
})
export class SpTreeviewNodeComponent implements OnInit {

  public SELECT_CHECKBOX = SELECT_CHECKBOX;
  public SELECT_RADIO = SELECT_RADIO;
  public SELECT_NONE = SELECT_NONE;

  public CHECKED = CHECKED;
  public INDETERMINATE = INDETERMINATE;

  public hide = false;

  @Input() public node: Node;
  @Input() public config: Config = new Config();
  @Input() public template: TemplateRef<SpTreeviewNodeTemplate>;

  @Output() public checkChange: EventEmitter<Node> = new EventEmitter<Node>();

  @Output() public radioSelect: EventEmitter<Node[]> = new EventEmitter<Node[]>();

  @Output() public checkboxSelect: EventEmitter<Node[]> = new EventEmitter<Node[]>();


  @Output() public delete: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() public addChild: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() public loadChild: EventEmitter<Node> = new EventEmitter<Node>();

  constructor() {

  }

  ngOnInit() {
    console.log(this.node);
    console.log(this.config);
  }

  onCollapseExpand = (node: Node) => {
    console.log("collapsed/expand");
    if (node.nodeState.collapsed) {
      if (this.config.treeLevelConfig.lazyLoad) {
        node.progress = true;
        this.loadChild.emit(node);
        return;
      }
    }
    node.nodeState.collapsed = !node.nodeState.collapsed;
  }

  onDelete = (node: Node) => {
    console.log(node);
    this.delete.emit(node);
  }

  onAddChild = (node: Node) => {
    console.log(node);
    this.addChild.emit(node);
  }

  onRadioChange = (event: MatRadioChange) => {
    console.log(event);
  }

  onCheckChange = (event: MatCheckboxChange) => {
    console.log(event);
  }

}