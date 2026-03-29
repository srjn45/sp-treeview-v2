import { Component, OnInit, Input, EventEmitter, Output, ViewChildren, QueryList, TemplateRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Config } from '../model/config';
import { CHECKED, UNCHECKED } from '../model/node-state';
import { SpTreeviewNodeComponent } from '../sp-treeview-node/sp-treeview-node.component';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { SpTreeviewNodeTemplateContext } from '../model/sp-treeview-node-template-context';
import { Node } from '../model/node';
import { SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE } from '../model/tree-level-config';

@Component({
  selector: 'sp-treeview',
  templateUrl: './sp-treeview.component.html',
  styleUrls: ['./sp-treeview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpTreeviewComponent implements OnInit, OnDestroy {

  public SELECT_CHECKBOX = SELECT_CHECKBOX;
  public SELECT_RADIO = SELECT_RADIO;
  public SELECT_NONE = SELECT_NONE;

  public CHECKED = CHECKED;
  public UNCHECKED = UNCHECKED;

  all = new Node('All', 'ALL');

  @Input() nodes: Node[];
  @Input() config: Config = new Config();

  @Input() template: TemplateRef<SpTreeviewNodeTemplate>;
  @Input() contextPrototype = SpTreeviewNodeTemplateContext.prototype;

  @Output() change: EventEmitter<Node[]> = new EventEmitter<Node[]>();
  @Output() delete: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() addChild: EventEmitter<Node> = new EventEmitter<Node>();
  @Output() loadChildren: EventEmitter<Node> = new EventEmitter<Node>();

  @ViewChildren('tree') trees: QueryList<SpTreeviewNodeComponent>;

  private searchDebounceTimer: any = null;

  constructor() { }

  ngOnInit() {
    // Wire the root-removal callback so Node.removeMe() can remove root nodes
    // without holding a direct reference to this component.
    this.config.treeLevelConfig.onRemoveRoot = (value: any) => {
      this.nodes = this.nodes.filter(n => n.value !== value);
    };
    this.nodes.forEach(n => { Node.nodify(n); n.setConfigRecursively(this.config); });
  }

  ngOnDestroy() {
    this.config.treeLevelConfig.onRemoveRoot = null;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  public getSelectedValues(): Node[] {
    const values: Node[] = [];
    this.nodes.forEach(n => n.getCheckedValues().forEach(v => values.push(v)));
    return values;
  }

  onSearch(event: Event) {
    const str = (event.target as HTMLInputElement).value;
    this.config.treeLevelConfig.searchStr = str;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => this.applySearch(), 300);
  }

  applySearch() {
    this.config.treeLevelConfig.progress = true;
    this.trees.forEach(t => t.search(this.config.treeLevelConfig.searchStr));
  }

  onChange(nodes: Node[]) {
    if (this.config.treeLevelConfig.select === SELECT_CHECKBOX) {
      const values: Node[] = [];
      this.trees.forEach(t => t.node.getCheckedValues().forEach(v => values.push(v)));
      const isAllChecked = this.nodes.every(node => node.nodeState.checked === CHECKED);
      if (isAllChecked) {
        this.all.nodeState.checked = CHECKED;
        this.change.emit([this.all]);
      } else {
        this.all.nodeState.checked = UNCHECKED;
        this.change.emit(values);
      }
    } else if (this.config.treeLevelConfig.select === SELECT_RADIO) {
      this.all.nodeState.checked = UNCHECKED;
      this.change.emit(nodes);
    }
  }

  onDelete(node: Node) {
    this.delete.emit(node);
  }

  onAddChild(node: Node) {
    this.addChild.emit(node);
  }

  onLoadChildren(node: Node) {
    this.loadChildren.emit(node);
    this.config.treeLevelConfig.pushLoad();
  }

  onAllRadioChange() {
    this.change.emit([this.all]);
  }

  onAllCheckChange(event: { checked: boolean }) {
    this.nodes.forEach(node => node.setCheckedRecursively(event.checked));
    this.change.emit(event.checked ? [this.all] : []);
  }

  onAddRoot() {
    this.addChild.emit(this.all);
  }

  trackByValue(_index: number, node: Node): any {
    return node.value;
  }
}
