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

    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    get children() {
        return this._children;
    }

    set children(children) {
        this._children = children;
        this._progress = false;
        this._nodeState.collapsed = false;
    }

    get progress() {
        return this._progress;
    }

    set progress(progress) {
        this._progress = progress;
    }

    get nodeState() {
        return this._nodeState;
    }

    set nodeState(nodeState) {
        this._nodeState = nodeState;
    }

    get nodeLevelConfig() {
        return this._nodeLevelConfig;
    }

    set nodeLevelConfig(nodeLevelConfig) {
        this._nodeLevelConfig = nodeLevelConfig;
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

    get checked() {
        return this._checked;
    }

    set checked(checked) {
        this._checked = checked;
    }

    get collapsed() {
        return this._collapsed;
    }

    set collapsed(collapsed) {
        this._collapsed = collapsed;
    }

    get disabled() {
        return this._disabled;
    }

    set disabled(disabled) {
        this._disabled = disabled;
    }
}