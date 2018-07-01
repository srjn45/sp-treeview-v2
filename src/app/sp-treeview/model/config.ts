import { TreeLevelConfig } from "./tree-level-config";
import { DropdownLevelConfig } from "./dropdown-level-config";

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
