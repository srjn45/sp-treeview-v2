import { Component, OnInit, Input, Output, TemplateRef, EventEmitter } from '@angular/core';
import { Config, SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from '../model/config';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { Node, CHECKED, INDETERMINATE, UNCHECKED } from '../model/node';
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

  // @Output() public checkChange: EventEmitter<Node> = new EventEmitter<Node>();

  @Output() public radioSelect: EventEmitter<Node[]> = new EventEmitter<Node[]>();

  @Output() public checkboxSelect: EventEmitter<Node[]> = new EventEmitter<Node[]>();


  @Output() public delete: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() public addChild: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() public loadChildren: EventEmitter<Node> = new EventEmitter<Node>();

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
        this.loadChildren.emit(node);
        return;
      }
    }
    node.nodeState.collapsed = !node.nodeState.collapsed;
  }

  onDelete = (node: Node) => {
    this.delete.emit(node);
  }

  onAddChild = (node: Node) => {
    this.addChild.emit(node);
  }

  onLoadChildren = (node: Node) => {
    this.loadChildren.emit(node);
  }

  onRadioChange = (event: MatRadioChange) => {
    console.log(event);
  }

  /**
   * called when the checkbox value is changed
   * sets checked value recursively
   */
  onCheckChange = (event: MatCheckboxChange) => {
    console.log(event);
    // set new check status for this node and its children
    this.node.nodeState.checked = event.checked ? CHECKED : UNCHECKED;
    this.node.changeChildrenRecursive();

    // notify parent of the change
    this.checkboxSelect.emit(this.node.getCheckedValues(this.config.treeLevelConfig.checkedValue));
  }

  childCheckboxSelected(values: any[]) {
    this.node.checkImmediateChildren();
    this.checkboxSelect.emit(this.node.getCheckedValues(this.config.treeLevelConfig.checkedValue));
  }

}