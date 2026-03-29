import { TreeLevelConfig } from './tree-level-config';
import { DropdownLevelConfig } from './dropdown-level-config';

export class Config {
    constructor(
        public treeLevelConfig: TreeLevelConfig = new TreeLevelConfig(),
        public dropdownLevelConfig: DropdownLevelConfig = new DropdownLevelConfig()
    ) { }
}
