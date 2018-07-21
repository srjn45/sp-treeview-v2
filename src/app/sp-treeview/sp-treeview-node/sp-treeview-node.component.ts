import { Component, OnInit, Input, Output, TemplateRef, EventEmitter } from '@angular/core';
import { Config } from '../model/config';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { CHECKED, INDETERMINATE, UNCHECKED } from '../model/node-state';
import { SpTreeviewNodeTemplateContext } from '../model/sp-treeview-node-template-context';
import { Node } from '../model/node';
import { SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from '../model/tree-level-config';

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
  public UNCHECKED = UNCHECKED;
  public INDETERMINATE = INDETERMINATE;

  @Input() public template: TemplateRef<SpTreeviewNodeTemplate>;
  @Input() public contextPrototype: any;

  @Input() public node: Node;
  @Input() public config: Config = new Config();

  @Output() public radioSelect: EventEmitter<Node[]> = new EventEmitter<Node[]>();
  @Output() public checkboxSelect: EventEmitter<null> = new EventEmitter<null>();

  @Output() public delete: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() public addChild: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() public loadChildren: EventEmitter<Node> = new EventEmitter<Node>();

  public context = new SpTreeviewNodeTemplateContext();

  constructor() {

  }

  ngOnInit() {
    // set input context prototype
    this.context = Object.setPrototypeOf(this.context, this.contextPrototype);
    // input
    this.context.node = this.node;
    this.context.config = this.config;
    // output
    this.context.addChild = this.addChild;
    this.context.delete = this.delete;
    this.context.loadChildren = this.loadChildren;
    this.context.checkboxSelect = this.checkboxSelect;
    this.context.radioSelect = this.radioSelect;
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

  onRadioChange(nodes: Node[]) {
    this.radioSelect.emit(nodes);
  }

  onCheckChange(nodes: Node[]) {
    this.node.checkImmediateChildren();
    this.checkboxSelect.emit();
  }

  search(text: string): boolean {
    return this.node.filter(text, this.loadChildren);
  }

}
