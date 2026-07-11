/**
 * Playwright e2e — the six journeys from spec §5, run against examples/index.html.
 *
 * We use `playwright-core` (never downloads a browser) driven by node's built-in
 * test runner, and point it at the chromium already cached under
 * ~/.cache/ms-playwright via an explicit `executablePath`. A tiny node:http
 * server serves the examples/ directory (including the pre-built vendor.js).
 *
 * Playwright's CSS locators pierce open shadow roots, so selectors like
 * `sp-tree#inline [data-id="canada"] [part="toggle"]` reach into (and across)
 * the elements' shadow DOM without any special syntax.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const EXAMPLES_DIR = resolve(fileURLToPath(import.meta.url), '..', '..');

// --- locate a cached chromium binary (full chrome preferred) ----------------
async function findChromiumExecutable(): Promise<string> {
  const cacheDir = process.env['PLAYWRIGHT_BROWSERS_PATH']?.trim()
    ? process.env['PLAYWRIGHT_BROWSERS_PATH']!.trim()
    : join(homedir(), '.cache', 'ms-playwright');
  const relPaths = [
    'chrome-linux/chrome',
    'chrome-linux64/chrome',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-win/chrome.exe',
    'chrome-linux/headless_shell',
    'chrome-linux64/headless_shell',
  ];
  let entries: string[] = [];
  try {
    entries = await readdir(cacheDir);
  } catch {
    throw new Error(`No Playwright browser cache at ${cacheDir}`);
  }
  const found: string[] = [];
  for (const entry of entries) {
    if (!entry.startsWith('chromium-') && !entry.startsWith('chromium_headless_shell-')) continue;
    for (const rel of relPaths) {
      const p = join(cacheDir, entry, rel);
      if (existsSync(p)) found.push(p);
    }
  }
  if (found.length === 0) {
    throw new Error(`No cached chromium binary found under ${cacheDir}`);
  }
  // Prefer a full chrome build over a headless_shell.
  found.sort((a, b) => (a.includes('headless_shell') ? 1 : 0) - (b.includes('headless_shell') ? 1 : 0));
  return found[0]!;
}

// --- minimal static file server ---------------------------------------------
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function startServer(rootDir: string): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        let pathname = decodeURIComponent(url.pathname);
        if (pathname === '/') pathname = '/index.html';
        // Resolve within rootDir and reject path traversal.
        const filePath = normalize(join(rootDir, pathname));
        if (!filePath.startsWith(rootDir)) {
          res.writeHead(403).end('Forbidden');
          return;
        }
        const info = await stat(filePath).catch(() => null);
        if (!info || !info.isFile()) {
          res.writeHead(404).end('Not found');
          return;
        }
        const body = await readFile(filePath);
        res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(500).end('Server error');
      }
    })();
  });
  return new Promise((resolveP) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolveP({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

// --- shared fixtures ---------------------------------------------------------
let browser: Browser;
let server: Server;
let baseUrl: string;

before(async () => {
  assert.ok(
    existsSync(join(EXAMPLES_DIR, 'vendor.js')),
    'vendor.js missing — run `npm run bundle` (the pretest hook does this) first',
  );
  const executablePath = await findChromiumExecutable();
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  ({ server, baseUrl } = await startServer(EXAMPLES_DIR));
});

after(async () => {
  await browser?.close();
  await new Promise<void>((r) => server?.close(() => r()));
});

/** Open a fresh page on the demo so journeys start from a clean state. */
async function openPage(): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/index.html`);
  // Wait until the custom elements have upgraded and rendered their first row.
  await page.locator('sp-tree#inline [data-id="india"]').waitFor({ state: 'visible' });
  return page;
}

// ---------------------------------------------------------------------------
// Journey 1 — lazy expand: spinner appears inline, children render on resolve
// (no extra click needed).
// ---------------------------------------------------------------------------
test('journey 1: lazy node expands, spinner shows, children render', async () => {
  const page = await openPage();
  try {
    // Canada is a lazy branch (hasChildren, children absent).
    await page.locator('sp-tree#inline [data-id="canada"] [part="toggle"]').click();

    // Inline spinner appears while the fake 300ms loader runs.
    await page
      .locator('sp-tree#inline [data-id="canada"] [part="spinner"]')
      .waitFor({ state: 'visible', timeout: 2000 });

    // Children render automatically once the promise resolves — no second click.
    await page.locator('sp-tree#inline [data-id="on"]').waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('sp-tree#inline [data-id="qc"]').waitFor({ state: 'visible' });

    // Spinner is gone (nothing stuck).
    assert.equal(await page.locator('sp-tree#inline [part="spinner"]').count(), 0);
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// Journey 2 — search reveals a matching leaf with ancestors expanded, no stuck
// progress; clearing restores prior expansion; nonsense query → "No results".
// ---------------------------------------------------------------------------
test('journey 2: search reveals, clears, and shows empty state', async () => {
  const page = await openPage();
  try {
    const input = page.locator('sp-tree#inline [part="search-input"]');
    await input.fill('Bengaluru');

    // Match revealed with its ancestors expanded (India → Karnataka → Bengaluru).
    await page.locator('sp-tree#inline [data-id="blr"]').waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('sp-tree#inline [data-id="india"]').waitFor({ state: 'visible' });
    await page.locator('sp-tree#inline [data-id="ka"]').waitFor({ state: 'visible' });

    // No stuck progress indicator anywhere in the tree.
    assert.equal(await page.locator('sp-tree#inline [part="spinner"]').count(), 0);

    // Direct match is highlighted.
    assert.equal(await page.locator('sp-tree#inline mark[part="match"]').count() >= 1, true);

    // Clearing restores the pre-filter (collapsed) state — Bengaluru drops out.
    await page.locator('sp-tree#inline [part="search-clear"]').click();
    await page.locator('sp-tree#inline [data-id="blr"]').waitFor({ state: 'detached', timeout: 3000 });

    // A nonsense query yields the empty state.
    await input.fill('zzzzzzzz');
    const empty = page.locator('sp-tree#inline [part="empty"]');
    await empty.waitFor({ state: 'visible', timeout: 3000 });
    assert.match((await empty.textContent()) ?? '', /no results/i);
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// Journey 3 — check a leaf → ancestors indeterminate; check its sibling →
// parent checked; sp-change payloads correct.
// ---------------------------------------------------------------------------
test('journey 3: cascade check drives indeterminate then checked', async () => {
  const page = await openPage();
  try {
    // Expand India then Maharashtra (multi-mode clicks toggle checkboxes, so use
    // the toggle buttons to expand).
    await page.locator('sp-tree#inline [data-id="india"] [part="toggle"]').click();
    await page.locator('sp-tree#inline [data-id="mh"] [part="toggle"]').click();
    await page.locator('sp-tree#inline [data-id="mum"]').waitFor({ state: 'visible' });

    // Check Mumbai → Maharashtra + India go indeterminate ("mixed").
    await page.locator('sp-tree#inline [data-id="mum"] [part="checkbox"]').click();
    await assertAttr(page, 'sp-tree#inline [data-id="mh"]', 'aria-checked', 'mixed');
    await assertAttr(page, 'sp-tree#inline [data-id="india"]', 'aria-checked', 'mixed');

    // Payload after one leaf: topmost fully-checked node is Mumbai.
    assert.match(await outText(page, '#inline-out'), /Mumbai/);

    // Check Pune → Maharashtra becomes fully checked.
    await page.locator('sp-tree#inline [data-id="pune"] [part="checkbox"]').click();
    await assertAttr(page, 'sp-tree#inline [data-id="mh"]', 'aria-checked', 'true');

    // Payload now collapses to the topmost fully-checked node: Maharashtra.
    assert.match(await outText(page, '#inline-out'), /Maharashtra/);
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// Journey 4 — dropdown: select two leaves, remove one chip → tree state and
// event payload update.
// ---------------------------------------------------------------------------
test('journey 4: dropdown selects two leaves, chip removal updates state', async () => {
  const page = await openPage();
  try {
    const dd = 'sp-tree-select#dropdown';
    await page.locator(`${dd} [part="field"]`).click();
    await page.locator(`${dd} [part="panel"]`).waitFor({ state: 'visible' });

    // Drill to two sibling leaves and check them.
    await page.locator(`${dd} [data-id="india"] [part="toggle"]`).click();
    await page.locator(`${dd} [data-id="mh"] [part="toggle"]`).click();
    await page.locator(`${dd} [data-id="mum"]`).waitFor({ state: 'visible' });
    await page.locator(`${dd} [data-id="mum"] [part="checkbox"]`).click();
    await page.locator(`${dd} [data-id="pune"] [part="checkbox"]`).click();

    // Two chips in the trigger field.
    await page.locator(`${dd} [part="chip"][data-id="mum"]`).waitFor({ state: 'visible' });
    await page.locator(`${dd} [part="chip"][data-id="pune"]`).waitFor({ state: 'visible' });
    assert.equal(await page.locator(`${dd} [part~="chip"]`).count(), 2);
    assert.match(await outText(page, '#dropdown-out'), /Mumbai|Maharashtra/);

    // Remove the Mumbai chip → only Pune remains, event payload updates.
    await page.locator(`${dd} [part="chip"][data-id="mum"] [part="chip-remove"]`).click();
    await page.locator(`${dd} [part="chip"][data-id="mum"]`).waitFor({ state: 'detached' });
    assert.equal(await page.locator(`${dd} [part="chip"][data-id="pune"]`).count(), 1);

    // Mumbai is unchecked in the tree; Pune stays checked. Scope to the tree
    // rows: chips also carry data-id, so qualify with role="treeitem".
    await assertAttr(page, `${dd} [role="treeitem"][data-id="mum"]`, 'aria-checked', 'false');
    await assertAttr(page, `${dd} [role="treeitem"][data-id="pune"]`, 'aria-checked', 'true');
    assert.match(await outText(page, '#dropdown-out'), /Pune/);
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// Journey 5 — keyboard-only: navigate the tree, expand with →, check with
// Space, open the dropdown with Enter, close with Escape, focus returns.
// ---------------------------------------------------------------------------
test('journey 5: keyboard navigation, expand, check, open/close dropdown', async () => {
  const page = await openPage();
  try {
    // Focus the first tree row (roving-tabindex single tab stop).
    await page.locator('sp-tree#inline [data-id="india"]').focus();

    // → expands India.
    await page.keyboard.press('ArrowRight');
    await assertAttr(page, 'sp-tree#inline [data-id="india"]', 'aria-expanded', 'true');
    await page.locator('sp-tree#inline [data-id="mh"]').waitFor({ state: 'visible' });

    // → moves to first child (Maharashtra); → expands it; → moves to Mumbai.
    await page.keyboard.press('ArrowRight'); // to Maharashtra
    await page.keyboard.press('ArrowRight'); // expand Maharashtra
    await page.locator('sp-tree#inline [data-id="mum"]').waitFor({ state: 'visible' });
    await page.keyboard.press('ArrowRight'); // to Mumbai

    // Space checks the focused row (Mumbai).
    await page.keyboard.press(' ');
    await assertAttr(page, 'sp-tree#inline [data-id="mum"]', 'aria-checked', 'true');

    // Open the dropdown from its trigger with Enter.
    await page.locator('sp-tree-select#dropdown [part="field"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('sp-tree-select#dropdown [part="panel"]').waitFor({ state: 'visible' });

    // Escape closes it and returns focus to the trigger.
    await page.keyboard.press('Escape');
    await page.locator('sp-tree-select#dropdown [part="panel"]').waitFor({ state: 'detached' });
    const activeId = await page.evaluate(() => document.activeElement?.id ?? '');
    assert.equal(activeId, 'dropdown');
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// Journey 6 — a closed dropdown panel is absent from the DOM (no hidden
// interactive/tab targets).
// ---------------------------------------------------------------------------
test('journey 6: closed dropdown panel is not in the DOM', async () => {
  const page = await openPage();
  try {
    const dd = 'sp-tree-select#dropdown';
    // Closed: no panel, no tree items.
    assert.equal(await page.locator(`${dd} [part="panel"]`).count(), 0);
    assert.equal(await page.locator(`${dd} [role="treeitem"]`).count(), 0);

    // Open → panel and rows exist.
    await page.locator(`${dd} [part="field"]`).click();
    await page.locator(`${dd} [part="panel"]`).waitFor({ state: 'visible' });
    assert.equal(await page.locator(`${dd} [part="panel"]`).count(), 1);
    assert.equal(await page.locator(`${dd} [role="treeitem"]`).count() > 0, true);

    // Close → gone again.
    await page.keyboard.press('Escape');
    await page.locator(`${dd} [part="panel"]`).waitFor({ state: 'detached' });
    assert.equal(await page.locator(`${dd} [part="panel"]`).count(), 0);
    assert.equal(await page.locator(`${dd} [role="treeitem"]`).count(), 0);
  } finally {
    await page.close();
  }
});

// --- small assertion helpers -------------------------------------------------
async function assertAttr(page: Page, selector: string, attr: string, expected: string): Promise<void> {
  const actual = await page.locator(selector).first().getAttribute(attr);
  assert.equal(actual, expected, `${selector} [${attr}] expected "${expected}", got "${actual}"`);
}

async function outText(page: Page, selector: string): Promise<string> {
  return (await page.locator(selector).textContent()) ?? '';
}
