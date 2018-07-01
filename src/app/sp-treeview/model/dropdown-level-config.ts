
/**
 * this class set the config for dropdown
 */
export class DropdownLevelConfig {
    constructor(
        private _height = 'auto',
        private _showDropdownDefault = false
    ) { }

    get height(): string {
        return this._height;
    }

    set height(height: string) {
        this._height = height;
    }

    get showDropdownDefault(): boolean {
        return this._showDropdownDefault;
    }

    set showDropdownDefault(showDropdownDefault: boolean) {
        this._showDropdownDefault = showDropdownDefault;
    }

}

