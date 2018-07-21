import { SpTreeviewComponent } from '../sp-treeview/sp-treeview.component';

export const SELECT_NONE = 0;
export const SELECT_CHECKBOX = 1;
export const SELECT_RADIO = 2;

/**
 * this class sets the config for complete tree
 */
export class TreeLevelConfig {

    private _treeview: SpTreeviewComponent;

    private loadChildrenStack = [];

    constructor(
        // make service call for children once or always
        private _loadOnce = true,
        private _select = SELECT_NONE,
        private _deleteNode = false,
        private _addChild = false,
        private _search = true,
        private _progress = false,
        private _searchStr = '',
    ) { }

    public get treeview(): SpTreeviewComponent {
        return this._treeview;
    }

    public set treeview(treeview: SpTreeviewComponent) {
        this._treeview = treeview;
    }

    public get loadOnce(): boolean {
        return this._loadOnce;
    }

    public set loadOnce(loadOnce: boolean) {
        this._loadOnce = loadOnce;
    }

    public get select(): number {
        return this._select;
    }

    public set select(select: number) {
        this._select = select;
    }

    public get search(): boolean {
        return this._search;
    }

    public set search(search: boolean) {
        this._search = search;
    }

    public get searchStr(): string {
        return this._searchStr;
    }

    public set searchStr(searchStr: string) {
        this._searchStr = searchStr;
    }

    public get progress(): boolean {
        return this._progress;
    }

    public set progress(progress: boolean) {
        this._progress = progress;
    }

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

    public loadChildren() {
        this.loadChildrenStack.push(1);
        console.log("push" + this.loadChildrenStack.length);
    }
    public childrenLoaded() {
        this.loadChildrenStack.pop();
        if (this.loadChildrenStack.length == 0) {
            this.progress = false;
        }
        console.log("pop" + this.loadChildrenStack.length);
    }

    public checkloadChildrenStackSize() {
        if (this.loadChildrenStack.length == 0) {
            this.progress = false;
        }
    }

}

