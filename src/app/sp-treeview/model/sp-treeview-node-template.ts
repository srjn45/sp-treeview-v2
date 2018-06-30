import { Node } from "./node";
import { Config } from "./config";

export interface SpTreeviewNodeTemplate {

    node: Node;
    config: Config;

    onCollapseExpand: () => void;
    onCheckChange: () => void;
    onRadioChange: () => void;
    onDelete: () => void;
    onAddChild: () => void;
    onLoadChild: () => void;

}
