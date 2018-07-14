
/**
 * this class public set the config for dropdown
 */
export class DropdownLevelConfig {
    constructor(
        private _height = 'auto',
        private _showDropdownDefault = false
    ) { }

    public get height(): string {
        return this._height;
    }

    public set height(height: string) {
        this._height = height;
    }

    public get showDropdownDefault(): boolean {
        return this._showDropdownDefault;
    }

    public set showDropdownDefault(showDropdownDefault: boolean) {
        this._showDropdownDefault = showDropdownDefault;
    }

}

