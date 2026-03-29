import { SpTreeviewComponent } from '../sp-treeview/sp-treeview.component';

export const SELECT_NONE = 0;
export const SELECT_CHECKBOX = 1;
export const SELECT_RADIO = 2;

export type SelectMode = typeof SELECT_NONE | typeof SELECT_CHECKBOX | typeof SELECT_RADIO;

/**
 * Tree-wide behaviour configuration.
 * Internal runtime properties (treeview, progress, searchStr, loadChildrenStack)
 * are managed by SpTreeviewComponent and should not be set by consumers.
 */
export class TreeLevelConfig {

    /** @internal set by SpTreeviewComponent on init */
    treeview: SpTreeviewComponent;

    /** @internal tracks in-flight lazy-load requests */
    private loadChildrenStack: number[] = [];

    /** @internal current progress-bar state */
    progress: boolean = false;

    /** @internal current search term */
    searchStr: string = '';

    constructor(
        public loadOnce: boolean = true,
        public allNode: boolean = true,
        public select: SelectMode = SELECT_NONE,
        public deleteNode: boolean = false,
        public addChild: boolean = false,
        public search: boolean = true
    ) { }

    /** @internal called when a lazy-load request is dispatched */
    pushLoad(): void {
        this.loadChildrenStack.push(1);
    }

    /** @internal called when a lazy-load request completes */
    popLoad(): void {
        this.loadChildrenStack.pop();
        if (this.loadChildrenStack.length === 0) {
            this.progress = false;
        }
    }

    /** @internal ensures progress is cleared when nothing is loading */
    syncProgress(): void {
        if (this.loadChildrenStack.length === 0) {
            this.progress = false;
        }
    }
}
