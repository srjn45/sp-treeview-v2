import { NodeLevelConfig, CHECKED_VALUE_PARENT, CHECKED_VALUE_LEAVES } from "./config";

export const CHECKED = 1;
export const UNCHECKED = 0;
export const INDETERMINATE = -1;

export class Node {

    /**
     * recursively sets prototype Node on the object and its children
     * 
     * @param node 
     */
    public static nodify(node: any): Node {
        node = Object.setPrototypeOf(node, Node.prototype);
        if (node.children != null) {
            node.children.forEach(n => this.nodify(n));
        }
        return node;
    }

    constructor(
        private _name: string,
        private _value: any,
        private _children?: Node[],
        private _progress = false,
        private _nodeState = new NodeState(),
        private _nodeLevelConfig = new NodeLevelConfig()
    ) {

    }

    get name(): string {
        return this._name;
    }

    set name(name: string) {
        this._name = name;
    }

    get value(): any {
        return this._value;
    }

    set value(value: any) {
        this._value = value;
    }

    get children(): Node[] {
        return this._children;
    }

    set children(children: Node[]) {
        this._children = children;
        this._progress = false;
        this._nodeState.collapsed = false;
    }

    get progress(): boolean {
        return this._progress;
    }

    set progress(progress: boolean) {
        this._progress = progress;
    }

    get nodeState(): NodeState {
        return this._nodeState;
    }

    set nodeState(nodeState: NodeState) {
        this._nodeState = nodeState;
    }

    get nodeLevelConfig(): NodeLevelConfig {
        return this._nodeLevelConfig;
    }

    set nodeLevelConfig(nodeLevelConfig: NodeLevelConfig) {
        this._nodeLevelConfig = nodeLevelConfig;
    }

    public addChild(child: Node) {
        if (this._children === null || this._children === undefined) {
            this._children = [];
        }
        this._children.push(child);
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
        console.log(this.name + this.nodeState.checked);
        if (this.children == null) {
            return;
        }
        this.children.forEach(n => {
            console.log(n);
            n.nodeState.checked = this.nodeState.checked;
            n.changeChildrenRecursive();
        });
    }

    public checkImmediateChildren() {
        if (this.children) {
            this.children.forEach(c => c.checkImmediateChildren());

            let checkedChildren: number = this.children.filter(n => n.nodeState.checked === CHECKED).length;

            let indeterminateChildren: number = this.children.filter(n => n.nodeState.checked === INDETERMINATE).length;

            if (indeterminateChildren > 0) {
                // if indeterminate child the indeterminate
                this.nodeState.checked = UNCHECKED;
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

    private checkedLeaves(): Node[] {
        if (this.nodeState.checked === UNCHECKED) {
            return [];
        }
        if (this.children) {
            let values = [];
            this.children.forEach(n => {
                n.checkedLeaves().forEach(v => values.push(v));
            });
            return values;
        } else {
            return [this];
        }
    }

    private checkedAll(): Node[] {
        if (this.nodeState.checked === CHECKED || this.nodeState.checked === INDETERMINATE) {
            if (this.children) {
                let values = [];
                if (this.nodeState.checked === CHECKED) {
                    values.push(this);
                }
                this.children.forEach(n => {
                    n.checkedAll().forEach(v => values.push(v));
                });
                return values;
            } else {
                return [this];
            }
        } else {
            return [];
        }
    }

    private checkedHighest(): Node[] {
        if (this.nodeState.checked === CHECKED) {
            return [this]
        }
        if (this.children) {
            let values = [];
            this.children.forEach(n => {
                n.checkedHighest().forEach(v => values.push(v));
            });
            return values;
        }
        return [];
    }

    public getCheckedValues(checkedValue: number): Node[] {
        if (checkedValue === CHECKED_VALUE_PARENT) {
            return this.checkedHighest();
        } else if (checkedValue === CHECKED_VALUE_LEAVES) {
            return this.checkedLeaves();
        } else {
            // selected values all
            return this.checkedAll();
        }
    }

}

/**
 * this class specifies the state(checked, collapsed, disabled) of the node
 */
export class NodeState {
    constructor(
        private _checked = UNCHECKED,
        private _collapsed = false,
        private _disabled = false
    ) { }

    get checked(): number {
        return this._checked;
    }

    set checked(checked: number) {
        this._checked = checked;
    }

    get collapsed(): boolean {
        return this._collapsed;
    }

    set collapsed(collapsed: boolean) {
        this._collapsed = collapsed;
    }

    get disabled(): boolean {
        return this._disabled;
    }

    set disabled(disabled: boolean) {
        this._disabled = disabled;
    }
}