import { Config } from './config';
import { EventEmitter } from '@angular/core';
import { NodeState, CHECKED, UNCHECKED, INDETERMINATE } from './node-state';
import { NodeLevelConfig } from './node-level-config';

export class Node {

    private config: Config;

    /**
     * recursively sets prototype Node on the object and its children
     *
     * @param node
     */
    public static nodify(obj: any, passByRef = true): Node {
        if (passByRef) {
            // node
            const node: Node = Object.setPrototypeOf(obj, Node.prototype);
            // nodeState
            if (node.nodeState == null) {
                node.nodeState = new NodeState();
            } else {
                node.nodeState = Object.setPrototypeOf(node.nodeState, NodeState.prototype);
            }
            // nodeLevelConfig
            if (node.nodeLevelConfig == null) {
                node.nodeLevelConfig = new NodeLevelConfig();
            } else {
                node.nodeLevelConfig = Object.setPrototypeOf(node.nodeLevelConfig, NodeLevelConfig.prototype);
            }
            // children
            if (node.children != null) {
                node.children.forEach(n => this.nodify(n));
            }
            return node;
        } else {
            // node
            const _node: Node = <Node>obj;
            const node: Node = new Node(_node.name, _node.value, _node.children, _node.progress, _node.nodeState, _node.nodeLevelConfig);
            // nodeState
            node.nodeState = new NodeState(node.nodeState.checked, node.nodeState.collapsed, node.nodeState.disabled, node.nodeState.hidden);
            // nodeLevelConfig
            const nodeLevelConfig = new NodeLevelConfig();
            Object.assign(nodeLevelConfig, node.nodeLevelConfig);
            node.nodeLevelConfig = nodeLevelConfig;
            // children
            if (node.children != null) {
                const _children: Node[] = [];
                node.children.forEach(n => _children.push(this.nodify(n, false)));
                node.children = _children;
            }
            return node;
        }
    }

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
        this._children = [];
        children.forEach(child =>
            this._children.push(Node.nodify(child))
        )
        this._progress = false;
        this._nodeState.collapsed = false;
        this.verifyStateRecursive();
        if (this.config != null && (this.config.treeLevelConfig.searchStr != null || this.config.treeLevelConfig.searchStr != '')) {
            this.config.treeLevelConfig.treeview.applySearch();
        }
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

    public addChild(child: Node) {
        if (this._children === null || this._children === undefined) {
            this._children = [];
        }
        this._children.push(Node.nodify(child));
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

    public filter(text: string, config: Config, loadChildren: EventEmitter<Node>): boolean {
        this.config = config;
        if (this.children == null) {
            if (this.name.toLowerCase().startsWith(text.toLowerCase())) {
                this.nodeState.hidden = false;
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
                let childMatchFound = child.filter(text, config, loadChildren);
                if (!matchFound) {
                    matchFound = childMatchFound;
                }
            });
            if (matchFound) {
                this.nodeState.hidden = false;
                this.nodeState.collapsed = false;
                return true;
            } else {
                this.nodeState.collapsed = true;
                if (this.name.toLowerCase().startsWith(text.toLowerCase())) {
                    this.nodeState.hidden = false;
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
}
