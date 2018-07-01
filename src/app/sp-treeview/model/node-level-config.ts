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