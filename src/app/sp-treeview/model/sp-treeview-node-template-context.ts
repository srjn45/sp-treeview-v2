import { SpTreeviewNodeTemplate } from "./sp-treeview-node-template";
import { SELECT_CHECKBOX, SELECT_RADIO, SELECT_NONE, Config } from "./config";
import { CHECKED, INDETERMINATE, Node, UNCHECKED } from "./node";
import { Output, EventEmitter } from "@angular/core";
import { MatRadioChange, MatCheckboxChange } from "@angular/material";

export class SpTreeviewNodeTemplateContext implements SpTreeviewNodeTemplate {

    public hide = false;

    public node: Node;
    public config: Config = new Config();

    radioSelect: EventEmitter<Node[]>;
    checkboxSelect: EventEmitter<Node[]>;
    delete: EventEmitter<Node>;
    addChild: EventEmitter<Node>;
    loadChildren: EventEmitter<Node>;

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
        this.radioSelect.emit([event.value]);
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

}
