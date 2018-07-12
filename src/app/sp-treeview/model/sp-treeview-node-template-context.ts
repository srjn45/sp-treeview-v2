import { SpTreeviewNodeTemplate } from './sp-treeview-node-template';
import { Config } from './config';
import { Node } from './node';
import { EventEmitter } from '@angular/core';
import { MatRadioChange, MatCheckboxChange } from '@angular/material';
import { CHECKED, UNCHECKED } from './node-state';

export class SpTreeviewNodeTemplateContext implements SpTreeviewNodeTemplate {

    node: Node;
    config: Config = new Config();

    radioSelect: EventEmitter<Node[]>;
    checkboxSelect: EventEmitter<null>;
    delete: EventEmitter<Node>;
    addChild: EventEmitter<Node>;
    loadChildren: EventEmitter<Node>;

    constructor() {

    }

    onCollapseExpand = (node: Node) => {
        node.unHideChildren();
        if (node.nodeState.collapsed) {
            if ((this.config.treeLevelConfig.loadOnce && node.children.length === 0) || (!this.config.treeLevelConfig.loadOnce)) {
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
        this.radioSelect.emit([event.value]);
    }

    /**
     * called when the checkbox value is changed
     * sets checked value recursively
     */
    onCheckChange = (event: MatCheckboxChange) => {
        // set new check status for this node and its children
        this.node.nodeState.checked = event.checked ? CHECKED : UNCHECKED;
        this.node.changeChildrenRecursive();

        // notify parent of the change
        this.checkboxSelect.emit();
    }

}
