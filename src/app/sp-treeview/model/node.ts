import { Config } from './config';
import { NodeState, CheckedState, CHECKED, UNCHECKED, INDETERMINATE } from './node-state';
import { NodeLevelConfig } from './node-level-config';

/** Plain data shape accepted by Node.fromJson() */
export interface NodeLike {
    name: string;
    value: any;
    children?: NodeLike[] | null;
    progress?: boolean;
    nodeState?: Partial<NodeState>;
    nodeLevelConfig?: Partial<NodeLevelConfig>;
}

export class Node {

    /** @internal set by SpTreeviewComponent on init */
    private _config!: Config;

    /** @internal stored so filter() can trigger lazy loads after children arrive */
    private _loadChildrenCb: ((node: Node) => void) | null = null;

    // ── public data properties ──────────────────────────────────────────────

    name: string;
    value: any;
    children: Node[] | null;
    progress: boolean;
    nodeState: NodeState;
    nodeLevelConfig: NodeLevelConfig;
    parent: Node | null = null;

    // ── constructor ─────────────────────────────────────────────────────────

    constructor(
        name: string,
        value: any,
        children?: Node[] | null,
        progress: boolean = false,
        nodeState: NodeState = new NodeState(),
        nodeLevelConfig: NodeLevelConfig = new NodeLevelConfig()
    ) {
        this.name = name;
        this.value = value;
        this.children = children === undefined ? null : children;
        this.progress = progress;
        this.nodeState = nodeState;
        this.nodeLevelConfig = nodeLevelConfig;
    }

    // ── static factory ──────────────────────────────────────────────────────

    /**
     * Recursively convert a plain object (e.g. from JSON) into a Node tree.
     * Replaces the old Object.setPrototypeOf anti-pattern.
     */
    public static fromJson(obj: NodeLike): Node {
        const nodeState = obj.nodeState
            ? new NodeState(
                (obj.nodeState.checked ?? UNCHECKED) as CheckedState,
                obj.nodeState.collapsed ?? true,
                obj.nodeState.disabled ?? false,
                obj.nodeState.hidden ?? false
            )
            : new NodeState();

        const nodeLevelConfig = obj.nodeLevelConfig
            ? new NodeLevelConfig(
                obj.nodeLevelConfig.deleteNode ?? null,
                obj.nodeLevelConfig.addChild ?? null
            )
            : new NodeLevelConfig();

        const children = obj.children
            ? obj.children.map(c => Node.fromJson(c))
            : (obj.children === null ? null : null);

        const node = new Node(
            obj.name,
            obj.value,
            children,
            obj.progress ?? false,
            nodeState,
            nodeLevelConfig
        );

        if (node.children) {
            node.children.forEach(child => { child.parent = node; });
        }

        return node;
    }

    /**
     * Ensure any already-constructed Node (e.g. passed as plain @Input data)
     * has proper parent back-references and config set.
     * Used internally by the component on init.
     */
    public static nodify(node: Node): Node {
        if (!node.nodeState) { node.nodeState = new NodeState(); }
        if (!node.nodeLevelConfig) { node.nodeLevelConfig = new NodeLevelConfig(); }
        if (node.children) {
            node.children.forEach(child => {
                child.parent = node;
                Node.nodify(child);
            });
        }
        return node;
    }

    /** Convert an array of plain objects to Node instances via fromJson(). */
    public static toNodeArray(objArr: NodeLike[]): Node[] {
        return objArr.map(obj => Node.fromJson(obj));
    }

    // ── config wiring (internal) ────────────────────────────────────────────

    public get config(): Config {
        return this._config;
    }

    public setConfigRecursively(config: Config): void {
        this._config = config;
        if (this.children) {
            this.children.forEach(child => child.setConfigRecursively(config));
        }
    }

    // ── public mutation API ─────────────────────────────────────────────────

    /** Call this inside your loadChildren event handler to inject fetched children. */
    public loadChildren(children: Node[]): void {
        this.children = children;
        Node.nodify(this);
        this.setConfigRecursively(this._config);
        this.progress = false;
        this.nodeState.collapsed = false;
        this.verifyStateRecursive();
        const searchStr = this._config?.treeLevelConfig?.searchStr;
        if (searchStr && this._loadChildrenCb) {
            this.children.forEach(child => child.filter(searchStr, this._loadChildrenCb));
        }
        this._config?.treeLevelConfig?.popLoad();
    }

    /** Append a new child node at runtime. */
    public addChild(child: Node): void {
        if (!this.children) {
            this.children = [];
        }
        Node.nodify(child);
        child.parent = this;
        this.children.push(child);
    }

    /** Remove this node from its parent's children, or from the root list if it is a root node. */
    public removeMe(): void {
        if (this.parent === null) {
            this._config?.treeLevelConfig?.onRemoveRoot?.(this.value);
        } else {
            this.parent.children = this.parent.children!.filter(c => c.value !== this.value);
        }
    }

    // ── state helpers ───────────────────────────────────────────────────────

    public verifyStateRecursive(): void {
        if (!this.children) { return; }
        if (this.nodeState.checked === CHECKED) {
            this.changeChildrenRecursive();
            return;
        }
        this.children.filter(n => n.children !== null).forEach(n => n.verifyStateRecursive());
        this.checkImmediateChildren();
    }

    public changeChildrenRecursive(): void {
        if (!this.children) { return; }
        this.children.forEach(n => {
            n.nodeState.checked = this.nodeState.checked;
            n.changeChildrenRecursive();
        });
    }

    public checkImmediateChildren(): void {
        if (!this.children || this.children.length === 0) { return; }
        this.children.forEach(c => c.checkImmediateChildren());
        const checkedCount = this.children.filter(n => n.nodeState.checked === CHECKED).length;
        const indeterminateCount = this.children.filter(n => n.nodeState.checked === INDETERMINATE).length;
        if (indeterminateCount > 0) {
            this.nodeState.checked = INDETERMINATE;
        } else if (checkedCount === this.children.length) {
            this.nodeState.checked = CHECKED;
        } else if (checkedCount === 0) {
            this.nodeState.checked = UNCHECKED;
        } else {
            this.nodeState.checked = INDETERMINATE;
        }
    }

    public getCheckedValues(): Node[] {
        if (this.nodeState.checked === CHECKED) { return [this]; }
        if (this.children) {
            return this.children.flatMap(n => n.getCheckedValues());
        }
        return [];
    }

    public setCheckedRecursively(checked: boolean): void {
        this.nodeState.checked = checked ? CHECKED : UNCHECKED;
        if (this.children) {
            this.children.forEach(child => child.setCheckedRecursively(checked));
        }
    }

    public unHideChildren(): void {
        if (this.children) {
            this.children.forEach(child => { child.nodeState.hidden = false; });
        }
    }

    public expandAndShowParentRecursively(): void {
        if (this.parent !== null) {
            this.parent.nodeState.hidden = false;
            this.parent.nodeState.collapsed = false;
            this.parent.expandAndShowParentRecursively();
        }
        this._config?.treeLevelConfig?.syncProgress();
    }

    /**
     * Recursively filter this node and its descendants by display name.
     * @param text     search term
     * @param onLoad   callback invoked when a lazy node needs to load children
     */
    public filter(text: string, onLoad: ((node: Node) => void) | null): boolean {
        this._loadChildrenCb = onLoad;
        if (this.children === null) {
            const matches = this.name.toLowerCase().includes(text.toLowerCase());
            this.nodeState.hidden = !matches;
            if (matches) { this.expandAndShowParentRecursively(); }
            return matches;
        }

        if (this.children.length === 0 && onLoad) {
            this.progress = true;
            onLoad(this);
        }

        const childMatch = this.children.reduce((found, child) => {
            return child.filter(text, onLoad) || found;
        }, false);

        if (childMatch) {
            this.nodeState.hidden = false;
            this.nodeState.collapsed = false;
            this.expandAndShowParentRecursively();
            return true;
        }

        this.nodeState.collapsed = true;
        const selfMatch = this.name.toLowerCase().includes(text.toLowerCase());
        this.nodeState.hidden = !selfMatch;
        if (selfMatch) { this.expandAndShowParentRecursively(); }
        return selfMatch;
    }
}
