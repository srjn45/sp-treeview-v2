// Live-demo wiring for the landing page. The bundle import registers
// <sp-tree> and <sp-tree-select>; every widget below gets its own deep copy of
// the data and its own loader, so the demos never leak state into each other.
import { TreeStore } from './sp-treeview.bundle.js';

function makeData() {
  return [
    {
      id: 'india', label: 'India',
      children: [
        { id: 'mh', label: 'Maharashtra', children: [
          { id: 'mum', label: 'Mumbai' },
          { id: 'pune', label: 'Pune' },
        ] },
        { id: 'ka', label: 'Karnataka', children: [
          { id: 'blr', label: 'Bengaluru' },
          { id: 'mys', label: 'Mysuru' },
        ] },
      ],
    },
    {
      id: 'usa', label: 'USA',
      children: [
        { id: 'ca', label: 'California', children: [
          { id: 'sf', label: 'San Francisco' },
          { id: 'la', label: 'Los Angeles' },
        ] },
        { id: 'ny', label: 'New York', children: [
          { id: 'nyc', label: 'New York City' },
        ] },
      ],
    },
    // hasChildren + no children key → lazy branch, resolved on first expand.
    { id: 'canada', label: 'Canada (lazy)', hasChildren: true },
    // A lazy branch whose loader rejects — exercises the error row + Retry.
    { id: 'atlantis', label: 'Atlantis (always fails)', hasChildren: true },
  ];
}

function makeLoadChildren() {
  const lazyChildren = {
    canada: [
      { id: 'on', label: 'Ontario', children: [
        { id: 'toronto', label: 'Toronto' },
        { id: 'ottawa', label: 'Ottawa' },
      ] },
      { id: 'qc', label: 'Quebec', children: [
        { id: 'montreal', label: 'Montreal' },
      ] },
    ],
  };
  return (node) => new Promise((resolve, reject) => {
    setTimeout(() => {
      if (node.id === 'atlantis') {
        reject(new Error('Could not reach Atlantis'));
        return;
      }
      resolve(JSON.parse(JSON.stringify(lazyChildren[node.id] ?? [])));
    }, 600);
  });
}

const labels = (nodes) => (nodes.length ? nodes.map((n) => n.label).join(', ') : '(none)');

function wireMultiOut(el, out) {
  el.addEventListener('sp-change', (e) => {
    const { checked, allSelected } = e.detail;
    out.innerHTML =
      `<span class="k">sp-change</span> checked: ${labels(checked)}` +
      `  |  allSelected: ${allSelected}`;
  });
}

// --- hero: multi + cascade + search + lazy, pre-seeded via an external store --
const hero = document.getElementById('demo-hero');
if (hero) {
  hero.store = new TreeStore({
    data: makeData(),
    selection: 'multi',
    cascade: true,
    loadChildren: makeLoadChildren(),
    initialExpanded: ['india', 'mh'],
    initialChecked: ['mum', 'pune'],
  });
  const out = document.getElementById('demo-hero-out');
  wireMultiOut(hero, out);
  out.innerHTML = '<span class="k">sp-change</span> checked: Maharashtra  |  allSelected: false';
}

// --- dropdown select field, inside a real <form> ------------------------------
const dropdown = document.getElementById('demo-dropdown');
if (dropdown) {
  dropdown.data = makeData();
  dropdown.loadChildren = makeLoadChildren();
  const out = document.getElementById('demo-dropdown-out');
  const form = document.getElementById('demo-form');
  dropdown.addEventListener('sp-change', (e) => {
    const value = new FormData(form).get('regions');
    out.innerHTML =
      `<span class="k">sp-change</span> checked: ${labels(e.detail.checked)}\n` +
      `<span class="k">FormData</span>  regions = ${value}`;
  });
}

// --- overlay select field -----------------------------------------------------
const overlay = document.getElementById('demo-overlay');
if (overlay) {
  overlay.data = makeData();
  overlay.loadChildren = makeLoadChildren();
  wireMultiOut(overlay, document.getElementById('demo-overlay-out'));
}

// --- single-select (radio) ----------------------------------------------------
const single = document.getElementById('demo-single');
if (single) {
  single.store = new TreeStore({
    data: makeData(),
    selection: 'single',
    loadChildren: makeLoadChildren(),
    initialExpanded: ['india'],
  });
  const out = document.getElementById('demo-single-out');
  single.addEventListener('sp-change', (e) => {
    out.innerHTML =
      `<span class="k">sp-change</span> selected: ${e.detail.selected ? e.detail.selected.label : 'null'}`;
  });
}

// --- lazy + error/retry -------------------------------------------------------
const lazy = document.getElementById('demo-lazy');
if (lazy) {
  lazy.data = makeData();
  lazy.loadChildren = makeLoadChildren();
  const out = document.getElementById('demo-lazy-out');
  lazy.addEventListener('sp-expand', (e) => {
    out.innerHTML = `<span class="k">sp-expand</span> ${e.detail.node.label}`;
  });
  lazy.addEventListener('sp-load-error', (e) => {
    out.innerHTML =
      `<span class="k">sp-load-error</span> ${e.detail.node.label}: ${e.detail.error.message}`;
  });
}

// --- theme playground ---------------------------------------------------------
const pg = document.getElementById('pg-tree');
if (pg) {
  pg.store = new TreeStore({
    data: makeData(),
    selection: 'multi',
    cascade: true,
    loadChildren: makeLoadChildren(),
    initialExpanded: ['india', 'ka'],
    initialChecked: ['blr'],
  });

  const stage = document.getElementById('pg-stage');
  const cssOut = document.getElementById('pg-css');
  const inputs = {
    accent: document.getElementById('pg-accent'),
    rowHeight: document.getElementById('pg-row-height'),
    indent: document.getElementById('pg-indent'),
    radius: document.getElementById('pg-radius'),
    font: document.getElementById('pg-font'),
  };
  let mode = 'dark';

  const darkTokens = {
    '--sp-tree-fg': '#f3f4f6', '--sp-tree-fg-muted': '#9ca3af',
    '--sp-tree-bg': '#111c2e', '--sp-tree-bg-hover': '#1e2a44',
    '--sp-tree-border': '#334155', '--sp-tree-accent-fg': '#0f172a',
  };
  const lightTokens = {
    '--sp-tree-fg': '#1a1a1a', '--sp-tree-fg-muted': '#6b7280',
    '--sp-tree-bg': '#ffffff', '--sp-tree-bg-hover': '#f3f4f6',
    '--sp-tree-border': '#d1d5db', '--sp-tree-accent-fg': '#ffffff',
  };

  function apply() {
    const tokens = {
      ...(mode === 'dark' ? darkTokens : lightTokens),
      '--sp-tree-accent': inputs.accent.value,
      '--sp-tree-row-height': `${inputs.rowHeight.value}px`,
      '--sp-tree-indent': `${inputs.indent.value}px`,
      '--sp-tree-radius': `${inputs.radius.value}px`,
      '--sp-tree-font-family': inputs.font.value,
    };
    for (const [k, v] of Object.entries(tokens)) pg.style.setProperty(k, v);
    stage.classList.toggle('light', mode === 'light');
    stage.classList.toggle('dark', mode === 'dark');
    document.getElementById('pg-row-height-val').textContent = `${inputs.rowHeight.value}px`;
    document.getElementById('pg-indent-val').textContent = `${inputs.indent.value}px`;
    document.getElementById('pg-radius-val').textContent = `${inputs.radius.value}px`;
    cssOut.innerHTML =
      'sp-tree {\n' +
      Object.entries(tokens)
        .map(([k, v]) => `  <span class="tok">${k}</span>: ${v};`)
        .join('\n') +
      '\n}';
  }

  for (const el of Object.values(inputs)) el.addEventListener('input', apply);
  for (const btn of document.querySelectorAll('#pg-mode button')) {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      for (const b of document.querySelectorAll('#pg-mode button')) {
        b.classList.toggle('active', b === btn);
      }
      apply();
    });
  }
  apply();
}
