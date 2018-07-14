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

    public get checked(): number {
        return this._checked;
    }

    public set checked(checked: number) {
        this._checked = checked;
    }

    public get collapsed(): boolean {
        return this._collapsed;
    }

    public set collapsed(collapsed: boolean) {
        this._collapsed = collapsed;
    }

    public get disabled(): boolean {
        return this._disabled;
    }

    public set disabled(disabled: boolean) {
        this._disabled = disabled;
    }

    public get hidden(): boolean {
        return this._hidden;
    }

    public set hidden(hidden: boolean) {
        this._hidden = hidden;
    }
}
