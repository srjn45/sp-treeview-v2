import { Component, OnInit, Input, TemplateRef, EventEmitter, Output, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { SpTreeviewComponent } from '../sp-treeview/sp-treeview.component';
import { Config } from '../model/config';
import { SpTreeviewNodeTemplate } from '../model/sp-treeview-node-template';
import { Node } from '../model/node';
import { SpTreeviewNodeTemplateContext } from '../model/sp-treeview-node-template-context';
import { UNCHECKED } from '../model/node-state';

@Component({
  selector: 'sp-treeview-dropdown',
  templateUrl: './sp-treeview-dropdown.component.html',
  styleUrls: ['./sp-treeview-dropdown.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SpTreeviewComponent,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
})
export class SpTreeviewDropdownComponent implements OnInit {

  @Input() placeholder: string = '';
  @Input() nodes: Node[] = [];
  @Input() config: Config = new Config();
  @Input() template!: TemplateRef<SpTreeviewNodeTemplate>;
  @Input() contextPrototype = SpTreeviewNodeTemplateContext.prototype;

  @Output() change = new EventEmitter<Node[]>();
  @Output() delete = new EventEmitter<Node>();
  @Output() addChild = new EventEmitter<Node>();
  @Output() loadChildren = new EventEmitter<Node>();

  @ViewChild(SpTreeviewComponent, { static: false }) tree!: SpTreeviewComponent;
  @ViewChild('chipScroll', { static: true }) chipScroll!: ElementRef<HTMLElement>;

  selectedNodes: Node[] = [];
  dropDown = false;

  ngOnInit() {
    this.nodes.forEach(n => {
      Node.nodify(n);
      n.verifyStateRecursive();
      n.getCheckedValues().forEach(v => this.selectedNodes.push(v));
    });
    this.dropDown = this.config.dropdownLevelConfig.showDropdownDefault;
  }

  scrollLeft(event: Event) {
    event.stopPropagation();
    this.chipScroll.nativeElement.scrollLeft -= 80;
  }

  scrollRight(event: Event) {
    event.stopPropagation();
    this.chipScroll.nativeElement.scrollLeft += 80;
  }

  remove(node: Node, event: Event): void {
    event.stopPropagation();
    node.nodeState.checked = UNCHECKED;
    this.nodes.forEach(n => n.checkImmediateChildren());
    this.selectedNodes = this.selectedNodes.filter(n => n !== node);
    const values: Node[] = [];
    if (this.tree) {
      this.tree.trees.forEach(t => t.node.getCheckedValues().forEach(v => values.push(v)));
    }
    this.change.emit(values);
  }

  onChange(nodes: Node[]) {
    this.selectedNodes = nodes;
    this.change.emit(nodes);
  }

  onDelete(node: Node) { this.delete.emit(node); }
  onAddChild(node: Node) { this.addChild.emit(node); }
  onLoadChildren(node: Node) { this.loadChildren.emit(node); }

  trackByValue(_index: number, node: Node): any { return node.value; }
}
