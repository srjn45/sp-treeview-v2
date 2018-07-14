/**
 * this class properties if public set will override the tree level config
 */
export class NodeLevelConfig {
    constructor(
        private _deleteNode?: boolean,
        private _addChild?: boolean
    ) { }

    public get deleteNode(): boolean {
        return this._deleteNode;
    }
    public set deleteNode(deleteNode: boolean) {
        this._deleteNode = deleteNode;
    }

    public get addChild(): boolean {
        return this._addChild;
    }
    public set addChild(addChild: boolean) {
        this._addChild = addChild;
    }
}
