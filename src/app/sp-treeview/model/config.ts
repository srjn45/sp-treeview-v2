export const SELECT_NONE = 0;
export const SELECT_CHECKBOX = 1;
export const SELECT_RADIO = 2;

export const CHECKED_VALUE_ALL = 0;
export const CHECKED_VALUE_LEAVES = 1;
export const CHECKED_VALUE_PARENT = 2;


export class Config {
    constructor(
        public treeLevelConfig = new TreeLevelConfig(),
        public dropdownLevelConfig = new DropdownLevelConfig()
    ) { }
}


/**
 * this class set the config for dropdown
 */
export class DropdownLevelConfig {
    constructor(
        public height = 'auto',
        public showDropdownDefault = false
    ) { }
}

/**
 * this class sets the config for complete tree
 */
export class TreeLevelConfig {
    constructor(
        // if lazyLoad then make service call for children
        public lazyLoad = false,
        public select = SELECT_NONE,
        public checkedValue = CHECKED_VALUE_LEAVES,
        public search = true,
        public deleteNode = false,
        public addChild = false
    ) { }
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