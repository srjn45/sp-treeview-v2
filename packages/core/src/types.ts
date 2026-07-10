export interface TreeNodeData<T = unknown> {
  id: string;
  label: string;
  value?: T;
  children?: TreeNodeData<T>[];
  /** hasChildren:true + children absent → lazy unloaded branch */
  hasChildren?: boolean;
  disabled?: boolean;
}

export type CheckedState = 'checked' | 'unchecked' | 'indeterminate';
export type SelectionMode = 'none' | 'single' | 'multi';

export interface TreeStoreOptions<T = unknown> {
  data: TreeNodeData<T>[];
  selection?: SelectionMode;
  cascade?: boolean;
  loadChildren?: (node: TreeNodeData<T>) => Promise<TreeNodeData<T>[]>;
  loadOnce?: boolean;
  matcher?: (query: string, node: TreeNodeData<T>) => boolean;
  initialChecked?: string[];
  initialExpanded?: string[];
}

export interface Row<T = unknown> {
  node: TreeNodeData<T>;
  level: number;       // 1-based; maps to aria-level
  setSize: number;     // aria-setsize
  posInSet: number;    // aria-posinset
  expandable: boolean;
  expanded: boolean;
  checked: CheckedState;
  selected: boolean;
  loading: boolean;
  loadError: Error | null;
  matched: boolean;    // true when this node matched the active filter
}

export type TreeChangeEvent =
  | { type: 'rows' }
  | { type: 'checked'; ids: string[] }
  | { type: 'selected'; id: string | null }
  | { type: 'load'; id: string; status: 'start' | 'success' | 'error' };
