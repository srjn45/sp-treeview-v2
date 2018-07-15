import { Component, OnInit, Input, EventEmitter, Output, ViewChild, TemplateRef } from '@angular/core';
import { Config } from '../model/config';
import { Node } from '../model/node';
import { SpTreeviewComponent } from '../sp-treeview/sp-treeview.component';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { UNCHECKED } from '../model/node-state';

@Component({
  selector: 'sp-treeview-overlay',
  templateUrl: './sp-treeview-overlay.component.html',
  styleUrls: ['./sp-treeview-overlay.component.css']
})
export class SpTreeviewOverlayComponent implements OnInit {

  @Input() placeholder: string;

  @Input() nodes: Node[];
  @Input() config: Config = new Config();

  @Input() template: TemplateRef<SpTreeviewNodeTemplate> = null;
  @Input() contextPrototype = null;

  @Output() change: EventEmitter<Node[]> = new EventEmitter<Node[]>();

  @Output() delete: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() addChild: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() loadChildren: EventEmitter<Node> = new EventEmitter<Node>();

  @ViewChild(SpTreeviewComponent) tree: SpTreeviewComponent;

  @ViewChild('chipList')
  public chipList: any;
  private chipsDiv: HTMLDivElement;

  visible = true;
  selectable = false;
  removable = true;

  selectedNodes: Node[] = [];

  public dropDown = false;


  constructor() {

  }

  ngOnInit() {
    const _nodes: Node[] = [];
    this.nodes.forEach(n => {
      n = Node.nodify(n);
      n.verifyStateRecursive();
      n.getCheckedValues().forEach(v => this.selectedNodes.push(v));
      _nodes.push(n);
    });
    this.nodes = _nodes;
    this.chipsDiv = this.chipList._elementRef.nativeElement.children[0];
    this.dropDown = this.config.dropdownLevelConfig.showDropdownDefault;
  }

  scrollLeft(event: Event) {
    event.stopPropagation();
    this.chipsDiv.scrollLeft -= 50;
  }

  scrollRight(event: Event) {
    event.stopPropagation();
    this.chipsDiv.scrollLeft += 50;
  }

  remove(node: Node): void {
    this.dropDown = !this.dropDown;
    node.nodeState.checked = UNCHECKED;
    this.nodes.forEach(n => n.checkImmediateChildren());
    let index = this.selectedNodes.findIndex(n => n === node);
    if (index !== -1) {
      this.selectedNodes.splice(index, 1);
    }
    let values = [];
    this.tree.trees.forEach(t => {
      t.node.getCheckedValues().forEach(v => values.push(v))
    });
    this.change.emit(values);
  }

  onChange(nodes: Node[]) {
    this.selectedNodes = nodes;
    this.change.emit(nodes);
  }

  onDelete(value) {
    this.delete.emit(value);
  }

  onAddChild(node: Node) {
    this.addChild.emit(node);
  }

  onLoadChildren(node: Node) {
    this.loadChildren.emit(node);
  }

}
