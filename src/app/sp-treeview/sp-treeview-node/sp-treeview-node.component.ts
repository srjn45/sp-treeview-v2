import { Component, OnInit, Input, Output, TemplateRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Default,
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

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Create context with the supplied prototype so custom context classes work.
    // Object.create only inherits prototype methods, not class-field arrow functions,
    // so all six handler functions must be explicitly assigned below.
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

    // Assign all six handler arrow fns so templates bound via ngTemplateOutlet
    // receive callable functions regardless of the context prototype used.
    this.context.onCollapseExpand = this.contextOnCollapseExpand;
    this.context.onCheckChange = this.contextOnCheckChange;
    this.context.onRadioChange = this.contextOnRadioChange;
    this.context.onDelete = this.onDelete;
    this.context.onAddChild = this.onAddChild;
    this.context.onLoadChildren = this.onLoadChildren;
  }

  // ── context handler arrow fns ───────────────────────────────────────────────

  contextOnCollapseExpand = (node: Node) => {
    node.unHideChildren();
    if (node.nodeState.collapsed) {
      const loadOnce = this.config.treeLevelConfig.loadOnce;
      if ((loadOnce && (node.children?.length ?? 0) === 0) || !loadOnce) {
        node.progress = true;
        this.loadChildren.emit(node);
        return;
      }
    }
    node.nodeState.collapsed = !node.nodeState.collapsed;
    this.cdr.markForCheck();
  }

  contextOnCheckChange = (event: { checked: boolean }) => {
    this.node.nodeState.checked = event.checked ? CHECKED : UNCHECKED;
    this.node.changeChildrenRecursive();
    this.checkboxSelect.emit();
  }

  contextOnRadioChange = (event: { value: Node }) => {
    this.radioSelect.emit([event.value]);
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
