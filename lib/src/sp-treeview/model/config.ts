import { SpTreeviewComponent } from "../sp-treeview/sp-treeview.component";

export const SELECT_NONE = 0;
export const SELECT_CHECKBOX = 1;
export const SELECT_RADIO = 2;

export class Config {
    constructor(
        private _treeLevelConfig = new TreeLevelConfig(),
        private _dropdownLevelConfig = new DropdownLevelConfig()
    ) { }

    get treeLevelConfig(): TreeLevelConfig {
        return this._treeLevelConfig;
    }

    set treeLevelConfig(treeLevelConfig: TreeLevelConfig) {
        this._treeLevelConfig = treeLevelConfig;
    }

    get dropdownLevelConfig(): DropdownLevelConfig {
        return this._dropdownLevelConfig;
    }

    set dropdownLevelConfig(dropdownLevelConfig: DropdownLevelConfig) {
        this._dropdownLevelConfig = dropdownLevelConfig;
    }
}


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

/**
 * this class sets the config for complete tree
 */
export class TreeLevelConfig {

    private _treeview: SpTreeviewComponent;

    constructor(
        // make service call for children once or always
        private _loadOnce = true,
        private _select = SELECT_NONE,
        private _deleteNode = false,
        private _addChild = false,
        private _search = true,
        private _progress = false,
        private _searchStr = '',
    ) { }

    get treeview(): SpTreeviewComponent {
        return this._treeview;
    }

    set treeview(treeview: SpTreeviewComponent) {
        this._treeview = treeview;
    }

    get loadOnce(): boolean {
        return this._loadOnce;
    }

    set loadOnce(loadOnce: boolean) {
        this._loadOnce = loadOnce;
    }

    get select(): number {
        return this._select;
    }

    set select(select: number) {
        this._select = select;
    }

    get search(): boolean {
        return this._search;
    }

    set search(search: boolean) {
        this._search = search;
    }

    get searchStr(): string {
        return this._searchStr;
    }

    set searchStr(searchStr: string) {
        this._searchStr = searchStr;
    }

    get progress(): boolean {
        return this._progress;
    }

    set progress(progress: boolean) {
        this._progress = progress;
    }

    get deleteNode(): boolean {
        return this._deleteNode;
    }

    set deleteNode(deleteNode: boolean) {
        this._deleteNode = deleteNode;
    }

    get addChild(): boolean {
        return this._addChild;
    }

    set addChild(addChild: boolean) {
        this._addChild = addChild;
    }

}


/**
 * this class properties if set will override the tree level config  
 */
export class NodeLevelConfig {
    constructor(
        private _deleteNode?: boolean,
        private _addChild?: boolean
    ) { }

    get deleteNode(): boolean {
        return this._deleteNode;
    }
    set deleteNode(deleteNode: boolean) {
        this._deleteNode = deleteNode;
    }

    get addChild(): boolean {
        return this._addChild;
    }
    set addChild(addChild: boolean) {
        this._addChild = addChild;
    }
}