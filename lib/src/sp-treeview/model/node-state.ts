export const CHECKED = 1;
export const UNCHECKED = 0;
export const INDETERMINATE = -1;

/**
 * this class specifies the state(checked, collapsed, disabled) of the node
 */
export class NodeState {
    constructor(
        private _checked = UNCHECKED,
        private _collapsed = true,
        private _disabled = false,
        private _hidden = false
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

    get hidden(): boolean {
        return this._hidden;
    }

    set hidden(hidden: boolean) {
        this._hidden = hidden;
    }
}
