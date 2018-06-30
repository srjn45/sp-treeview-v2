import { Component, OnInit, Input, EventEmitter, Output, ViewChildren, QueryList, TemplateRef } from '@angular/core';
import { Config, SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from '../model/config';
import { Node, CHECKED, UNCHECKED, INDETERMINATE } from '../model/node';
import { SpTreeviewNodeComponent } from '../sp-treeview-node/sp-treeview-node.component';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { SpTreeviewNodeTemplateContext } from '../model/sp-treeview-node-template-context';

@Component({
  selector: 'sp-treeview',
  templateUrl: './sp-treeview.component.html',
  styleUrls: ['./sp-treeview.component.css']
})
export class SpTreeviewComponent implements OnInit {

  public SELECT_CHECKBOX = SELECT_CHECKBOX;
  public SELECT_RADIO = SELECT_RADIO;
  public SELECT_NONE = SELECT_NONE;

  public CHECKED = CHECKED;
  public UNCHECKED = UNCHECKED;
  public INDETERMINATE = INDETERMINATE;

  @Input() nodes: Node[];
  @Input() config: Config = new Config();

  @Input() template: TemplateRef<SpTreeviewNodeTemplate>;
  @Input() contextPrototype = SpTreeviewNodeTemplateContext.prototype;

  @Output() change: EventEmitter<Node[]> = new EventEmitter<Node[]>();

  @Output() delete: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() addChild: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() loadChildren: EventEmitter<Node> = new EventEmitter<Node>();

  @ViewChildren('tree') trees: QueryList<SpTreeviewNodeComponent>;

  constructor() { }

  ngOnInit() {
    this.nodes.forEach(n => Node.nodify(n));
  }

  public getSelectedValues(): Node[] {
    let values: Node[];
    this.nodes.forEach(n => n.getCheckedValues().forEach(v => values.push(v)));
    return values;
  }

  onFilter(event: Event) {
    this.applyFilter((<HTMLInputElement>event.srcElement).value);
  }
  applyFilter(text: string) {
    this.trees.forEach(t => t.search(text));
  }

  onChange(nodes: Node[]) {
    if (this.config.treeLevelConfig.select === SELECT_CHECKBOX) {
      let values = [];
      this.trees.forEach(t => {
        t.node.getCheckedValues().forEach(v => values.push(v))
      });
      this.change.emit(values);
    } else if (this.config.treeLevelConfig.select === SELECT_RADIO) {
      this.change.emit(nodes);
    }
  }

  onDelete(node) {
    this.delete.emit(node);
  }

  onAddChild(node: Node) {
    this.addChild.emit(node);
  }

  onLoadChildren(node: Node) {
    this.loadChildren.emit(node);
  }

}
