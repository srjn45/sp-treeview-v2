import { NodeLevelConfig } from "./config";

export const CHECKED = 1;
export const UNCHECKED = 0;
export const INDETERMINATE = -1;

export class Node {

    constructor(
        public name: string,
        public value: any,
        public children?: Node[],
        public progress = false,
        public nodeState = new NodeState(),
        public nodeLevelConfig = new NodeLevelConfig()
    ) {

    }

}

/**
 * this class specifies the state(checked, collapsed, disabled) of the node
 */
export class NodeState {
    constructor(
        public checked = UNCHECKED,
        public collapsed = false,
        public disabled = false
    ) { }
}