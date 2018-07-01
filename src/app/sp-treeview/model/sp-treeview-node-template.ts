import { Node } from "./node";
import { Config } from "./config";
import { MatRadioChange, MatCheckboxChange } from "@angular/material";
import { EventEmitter } from "@angular/core";

export interface SpTreeviewNodeTemplate {

    node: Node;
    config: Config;

    delete: EventEmitter<Node>;
    addChild: EventEmitter<Node>;
    loadChildren: EventEmitter<Node>;
    radioSelect: EventEmitter<Node[]>;
    checkboxSelect: EventEmitter<null>;

    onCollapseExpand: (node: Node) => void;
    onCheckChange: (node: MatCheckboxChange) => void;
    onRadioChange: (node: MatRadioChange) => void;
    onDelete: (node: Node) => void;
    onAddChild: (node: Node) => void;
    onLoadChildren: (node: Node) => void;

}
