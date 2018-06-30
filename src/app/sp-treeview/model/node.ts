import { NodeLevelConfig } from "./config";

export const CHECKED = 1;
export const UNCHECKED = 0;
export const INDETERMINATE = -1;

export class Node {

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