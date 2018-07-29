import { Config } from './config';
import { EventEmitter } from '@angular/core';
import { NodeState, CHECKED, UNCHECKED, INDETERMINATE } from './node-state';
import { NodeLevelConfig } from './node-level-config';

export class Node {

    private config: Config;
    private loadChildrenEvent: EventEmitter<Node>;

    /**
     * recursively sets prototype Node on the object and its children
     *
     * @param node
     */
    public static nodify(obj: any): Node {
        const node: Node = Object.setPrototypeOf(obj, Node.prototype);
        // nodeState
        if (node.nodeState == null || node.nodeState == undefined) {
            node.nodeState = new NodeState();
        } else {
            node.nodeState = Object.setPrototypeOf(node.nodeState, NodeState.prototype);
        }
        // nodeLevelConfig
        if (node.nodeLevelConfig == null || node.nodeLevelConfig == undefined) {
            node.nodeLevelConfig = new NodeLevelConfig();
        } else {
            node.nodeLevelConfig = Object.setPrototypeOf(node.nodeLevelConfig, NodeLevelConfig.prototype);
        }
        // children
        if (node.children != null) {
            node.children.forEach(child => { this.nodify(child); child.parent = node; });
        }
        return node;
    }

    public static toNodeArray(objArr: any[]): Node[] {
        let nodes: Node[] = [];
        objArr.forEach(obj => { nodes.push(new Node(obj.name, obj.value, obj.children, obj.progress, obj.nodeState, obj.nodeLevelConfig)); });
        return nodes;
    }

    private _parent: Node = null;

    constructor(
        private _name: string,
        private _value: any,
        private _children?: Node[],
        private _progress = false,
        private _nodeState = new NodeState(),
        private _nodeLevelConfig = new NodeLevelConfig()
    ) {
        if (this._children == undefined || this._children === undefined) {
            this._children = null;
        }
    }

    public get name(): string {
        return this._name;
    }

    public set name(name: string) {
        this._name = name;
    }

    public get value(): any {
        return this._value;
    }

    public set value(value: any) {
        this._value = value;
    }

    public get children(): Node[] {
        return this._children;
    }

    public set children(children: Node[]) {
        this._children = children;
    }

    public loadChildren(children: any[]) {
        // children.forEach(child => Node.nodify(child));
        this._children = children;
        Node.nodify(this);
        this.setConfigRecursively(this.config);
        this._progress = false;
        this._nodeState.collapsed = false;
        this.verifyStateRecursive();
        console.log(typeof this.config.treeLevelConfig.searchStr);
        if (this.config.treeLevelConfig.searchStr != null && this.config.treeLevelConfig.searchStr != '') {
            this._children.forEach(child => child.filter(this.config.treeLevelConfig.searchStr, this.loadChildrenEvent));
        }
        this.config.treeLevelConfig.childrenLoaded();
    }

    public addChild(child: Node) {
        if (this._children === null || this._children === undefined) {
            this._children = [];
        }
        this._children.push(Node.nodify(child));
        Node.nodify(this);
    }

    public get progress(): boolean {
        return this._progress;
    }

    public set progress(progress: boolean) {
        this._progress = progress;
    }

    public get nodeState(): NodeState {
        return this._nodeState;
    }

    public set nodeState(nodeState: NodeState) {
        this._nodeState = nodeState;
    }

    public get nodeLevelConfig(): NodeLevelConfig {
        return this._nodeLevelConfig;
    }

    public set nodeLevelConfig(nodeLevelConfig: NodeLevelConfig) {
        this._nodeLevelConfig = nodeLevelConfig;
    }

    public get parent(): Node {
        return this._parent;
    }

    public set parent(node: Node) {
        this._parent = node;
    }

    public setConfigRecursively(config: Config) {
        this.config = config;
        if (this.children != null) {
            this.children.forEach(child => child.setConfigRecursively(config));
        }
    }

    public verifyStateRecursive() {
        if (this.children == null) {
            return;
        }

        if (this._nodeState.checked === CHECKED) {
            this.changeChildrenRecursive();
            return;
        }

        this.children.filter(n => n.children != null).forEach(n => n.verifyStateRecursive());

        this.checkImmediateChildren();
    }

    public changeChildrenRecursive() {
        if (this.children == null) {
            return;
        }
        this.children.forEach(n => {
            n.nodeState.checked = this.nodeState.checked;
            n.changeChildrenRecursive();
        });
    }

    public checkImmediateChildren() {
        if (this.children && this.children.length > 0) {
            this.children.forEach(c => c.checkImmediateChildren());

            let checkedChildren: number = this.children.filter(n => n.nodeState.checked === CHECKED).length;

            let indeterminateChildren: number = this.children.filter(n => n.nodeState.checked === INDETERMINATE).length;

            if (indeterminateChildren > 0) {
                // if indeterminate child the indeterminate
                this.nodeState.checked = INDETERMINATE;
            } else {
                // if no indeterminate child
                if (checkedChildren === this.children.length) {
                    // if all checked then checked
                    this.nodeState.checked = CHECKED;
                } else if (checkedChildren === 0) {
                    // if all unchecked then unchecked
                    this.nodeState.checked = UNCHECKED;
                } else {
                    // if not all checked then indeterminate
                    this.nodeState.checked = INDETERMINATE;
                }
            }
        }
    }

    public getCheckedValues(): Node[] {
        if (this.nodeState.checked === CHECKED) {
            return [this]
        }
        if (this.children) {
            let values = [];
            this.children.forEach(n => {
                n.getCheckedValues().forEach(v => values.push(v));
            });
            return values;
        }
        return [];
    }

    public expandAndShowParentRecursively() {
        if (this.parent != null) {
            this.parent.nodeState.hidden = false;
            this.parent.nodeState.collapsed = false;
            this.parent.expandAndShowParentRecursively();
        }
        this.config.treeLevelConfig.checkloadChildrenStackSize();
    }

    public filter(text: string, loadChildren: EventEmitter<Node>): boolean {
        this.loadChildrenEvent = loadChildren;
        if (this.children == null) {
            if (this.name.toLowerCase().startsWith(text.toLowerCase())) {
                this.nodeState.hidden = false;
                this.expandAndShowParentRecursively();
                return true;
            } else {
                this.nodeState.hidden = true;
                return false;
            }
        } else {
            if (this.children.length === 0) {
                this.progress = true;
                loadChildren.emit(this);
            }
            let matchFound = false;
            this.children.forEach(child => {
                let childMatchFound = child.filter(text, loadChildren);
                if (!matchFound) {
                    matchFound = childMatchFound;
                }
            });
            if (matchFound) {
                this.nodeState.hidden = false;
                this.nodeState.collapsed = false;
                this.expandAndShowParentRecursively();
                return true;
            } else {
                this.nodeState.collapsed = true;
                if (this.name.toLowerCase().startsWith(text.toLowerCase())) {
                    this.nodeState.hidden = false;
                    this.expandAndShowParentRecursively();
                    return true;
                } else {
                    this.nodeState.hidden = true;
                    return false;
                }
            }
        }
    }

    public unHideChildren() {
        if (this.children) {
            this.children.forEach(child => {
                child.nodeState.hidden = false;
            });
        }
    }

    public setCheckedRecursively(checked: boolean) {
        if (checked) {
            this.nodeState.checked = CHECKED;
        } else {
            this.nodeState.checked = UNCHECKED;
        }
        if (this.children) {
            this.children.forEach(child => {
                child.setCheckedRecursively(checked);
            });
        }
    }

    public removeMe() {
        if (this.parent == null) {
            this.config.treeLevelConfig.treeview.nodes = this.config.treeLevelConfig.treeview.nodes.filter(node => node.value != this.value);
        } else {
            this.parent.children = this.parent.children.filter(child => child.value != this.value);
        }
    }
}
