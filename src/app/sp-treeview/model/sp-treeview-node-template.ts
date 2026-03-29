import { EventEmitter } from '@angular/core';
import { Node } from './node';
import { Config } from './config';

export interface SpTreeviewNodeTemplate {
    node: Node;
    config: Config;

    delete: EventEmitter<Node>;
    addChild: EventEmitter<Node>;
    loadChildren: EventEmitter<Node>;
    radioSelect: EventEmitter<Node[]>;
    checkboxSelect: EventEmitter<null>;

    onCollapseExpand: (node: Node) => void;
    onCheckChange: (event: { checked: boolean }) => void;
    onRadioChange: (event: { value: Node }) => void;
    onDelete: (node: Node) => void;
    onAddChild: (node: Node) => void;
    onLoadChildren: (node: Node) => void;
}
