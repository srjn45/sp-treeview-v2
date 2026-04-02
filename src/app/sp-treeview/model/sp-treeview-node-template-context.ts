import { EventEmitter } from '@angular/core';
import { SpTreeviewNodeTemplate } from './sp-treeview-node-template';
import { Config } from './config';
import { Node } from './node';
import { CHECKED, UNCHECKED } from './node-state';

export class SpTreeviewNodeTemplateContext implements SpTreeviewNodeTemplate {

    node!: Node;
    config: Config = new Config();

    radioSelect!: EventEmitter<Node[]>;
    checkboxSelect!: EventEmitter<null>;
    delete!: EventEmitter<Node>;
    addChild!: EventEmitter<Node>;
    loadChildren!: EventEmitter<Node>;

    public onCollapseExpand = (node: Node) => {
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
    }

    public onDelete = (node: Node) => {
        this.delete.emit(node);
    }

    public onAddChild = (node: Node) => {
        this.addChild.emit(node);
    }

    public onLoadChildren = (node: Node) => {
        this.loadChildren.emit(node);
    }

    public onRadioChange = (event: { value: Node }) => {
        this.radioSelect.emit([event.value]);
    }

    /**
     * Called when a checkbox value changes.
     * Sets the checked state on this node and all its descendants,
     * then notifies the parent component via checkboxSelect.
     */
    public onCheckChange = (event: { checked: boolean }) => {
        this.node.nodeState.checked = event.checked ? CHECKED : UNCHECKED;
        this.node.changeChildrenRecursive();
        this.checkboxSelect.emit();
    }
}
