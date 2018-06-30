export const SELECT_NONE = 0;
export const SELECT_CHECKBOX = 1;
export const SELECT_RADIO = 2;

export const CHECKED_VALUE_ALL = 0;
export const CHECKED_VALUE_LEAVES = 1;
export const CHECKED_VALUE_PARENT = 2;


export class Config {
    constructor(
        private _treeLevelConfig = new TreeLevelConfig(),
        private _dropdownLevelConfig = new DropdownLevelConfig()
    ) { }

    get treeLevelConfig() {
        return this._treeLevelConfig;
    }

    set treeLevelConfig(treeLevelConfig) {
        this._treeLevelConfig = treeLevelConfig;
    }

    get dropdownLevelConfig() {
        return this._dropdownLevelConfig;
    }

    set dropdownLevelConfig(dropdownLevelConfig) {
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

    get height() {
        return this._height;
    }

    set height(height) {
        this._height = height;
    }

    get showDropdownDefault() {
        return this._showDropdownDefault;
    }

    set showDropdownDefault(showDropdownDefault) {
        this._showDropdownDefault = showDropdownDefault;
    }

}

/**
 * this class sets the config for complete tree
 */
export class TreeLevelConfig {
    constructor(
        // if lazyLoad then make service call for children
        private _lazyLoad = false,
        private _select = SELECT_NONE,
        private _checkedValue = CHECKED_VALUE_LEAVES,
        private _search = true,
        private _deleteNode = false,
        private _addChild = false
    ) { }

    get lazyLoad() {
        return this._lazyLoad;
    }

    set lazyLoad(lazyLoad) {
        this._lazyLoad = lazyLoad;
    }

    get select() {
        return this._select;
    }

    set select(select) {
        this._select = select;
    }

    get checkedValue() {
        return this._checkedValue;
    }

    set checkedValue(checkedValue) {
        this._select = checkedValue;
    }

    get search() {
        return this._search;
    }

    set search(search) {
        this._search = search;
    }

    get deleteNode() {
        return this._deleteNode;
    }

    set deleteNode(deleteNode) {
        this._deleteNode = deleteNode;
    }

    get addChild() {
        return this._addChild;
    }

    set addChild(addChild) {
        this._addChild = addChild;
    }

}


/**
 * this class properties if set will override the tree level config  
 */
export class NodeLevelConfig {
    constructor(
        public deleteNode?: boolean,
        public addChild?: boolean
    ) { }
}