import { TreeLevelConfig } from './tree-level-config';
import { DropdownLevelConfig } from './dropdown-level-config';

export class Config {
    constructor(
        private _treeLevelConfig = new TreeLevelConfig(),
        private _dropdownLevelConfig = new DropdownLevelConfig()
    ) { }

    public get treeLevelConfig(): TreeLevelConfig {
        return this._treeLevelConfig;
    }

    public set treeLevelConfig(treeLevelConfig: TreeLevelConfig) {
        this._treeLevelConfig = treeLevelConfig;
    }

    public get dropdownLevelConfig(): DropdownLevelConfig {
        return this._dropdownLevelConfig;
    }

    public set dropdownLevelConfig(dropdownLevelConfig: DropdownLevelConfig) {
        this._dropdownLevelConfig = dropdownLevelConfig;
    }
}
