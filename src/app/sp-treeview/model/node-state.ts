export const CHECKED = 1;
export const UNCHECKED = 0;
export const INDETERMINATE = -1;

export type CheckedState = typeof CHECKED | typeof UNCHECKED | typeof INDETERMINATE;

export class NodeState {
    constructor(
        public checked: CheckedState = UNCHECKED,
        public collapsed: boolean = true,
        public disabled: boolean = false,
        public hidden: boolean = false
    ) { }
}
