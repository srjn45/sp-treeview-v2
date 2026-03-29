/**
 * Per-node overrides for tree-level config.
 * A null/undefined value means "inherit from TreeLevelConfig".
 */
export class NodeLevelConfig {
    constructor(
        public deleteNode: boolean | null = null,
        public addChild: boolean | null = null
    ) { }
}
