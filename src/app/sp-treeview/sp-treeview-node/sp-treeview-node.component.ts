import { Component, OnInit, Input, Output, TemplateRef, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Config } from '../model/config';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { CHECKED, INDETERMINATE, UNCHECKED } from '../model/node-state';
import { SpTreeviewNodeTemplateContext } from '../model/sp-treeview-node-template-context';
import { Node } from '../model/node';
import { SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from '../model/tree-level-config';

@Component({
  selector: 'sp-treeview-node',
  templateUrl: './sp-treeview-node.component.html',
  styleUrls: ['./sp-treeview-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    // Self-import for recursive usage
    SpTreeviewNodeComponent,
  ],
})
export class SpTreeviewNodeComponent implements OnInit {

  public SELECT_CHECKBOX = SELECT_CHECKBOX;
  public SELECT_RADIO = SELECT_RADIO;
  public SELECT_NONE = SELECT_NONE;

  public CHECKED = CHECKED;
  public UNCHECKED = UNCHECKED;
  public INDETERMINATE = INDETERMINATE;

  @Input() public template!: TemplateRef<SpTreeviewNodeTemplate>;
  @Input() public contextPrototype: any;

  @Input() public node!: Node;
  @Input() public config: Config = new Config();

  @Output() public radioSelect = new EventEmitter<Node[]>();
  @Output() public checkboxSelect = new EventEmitter<void>();
  @Output() public delete = new EventEmitter<Node>();
  @Output() public addChild = new EventEmitter<Node>();
  @Output() public loadChildren = new EventEmitter<Node>();

  public context!: SpTreeviewNodeTemplateContext;

  ngOnInit() {
    // Create context with the supplied prototype so custom context classes work.
    // Object.create is the correct way to use prototype-based delegation.
    this.context = Object.create(
      this.contextPrototype ?? SpTreeviewNodeTemplateContext.prototype
    ) as SpTreeviewNodeTemplateContext;

    this.context.node = this.node;
    this.context.config = this.config;
    this.context.addChild = this.addChild;
    this.context.delete = this.delete;
    this.context.loadChildren = this.loadChildren;
    this.context.checkboxSelect = this.checkboxSelect as any;
    this.context.radioSelect = this.radioSelect;
  }

  onDelete = (node: Node) => this.delete.emit(node);
  onAddChild = (node: Node) => this.addChild.emit(node);
  onLoadChildren = (node: Node) => this.loadChildren.emit(node);

  onRadioChange(nodes: Node[]) {
    this.radioSelect.emit(nodes);
  }

  onCheckChange(_nodes: Node[]) {
    this.node.checkImmediateChildren();
    this.checkboxSelect.emit();
  }

  search(text: string): boolean {
    return this.node.filter(text, (node) => this.loadChildren.emit(node));
  }

  trackByValue(_index: number, node: Node): any {
    return node.value;
  }
}
