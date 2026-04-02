export const SELECT_NONE = 0;
export const SELECT_CHECKBOX = 1;
export const SELECT_RADIO = 2;

export type SelectMode = typeof SELECT_NONE | typeof SELECT_CHECKBOX | typeof SELECT_RADIO;

/**
 * Tree-wide behaviour configuration.
 *
 * Internal runtime properties (onRemoveRoot, progress, searchStr, loadChildrenStack)
 * are wired by SpTreeviewComponent and must not be set by consumers.
 */
export class TreeLevelConfig {

    /**
     * @internal
     * Callback registered by SpTreeviewComponent so that Node.removeMe() can
     * remove a root-level node without holding a direct reference to the component.
     */
    onRemoveRoot: ((value: any) => void) | null = null;

    /**
     * @internal
     * Callback fired by popLoad() when the load stack empties.
     * Wired by SpTreeviewComponent to call cdr.detectChanges().
     */
    onPopLoad: (() => void) | null = null;

    /** @internal current progress-bar state */
    progress: boolean = false;

    /** @internal current search term */
    searchStr: string = '';

    /** @internal in-flight lazy-load counter */
    private loadChildrenStack: number[] = [];

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
            this.onPopLoad?.();
        }
    }

    /** @internal ensures progress is cleared when nothing is loading */
    syncProgress(): void {
        if (this.loadChildrenStack.length === 0) {
            this.progress = false;
        }
    }
}
