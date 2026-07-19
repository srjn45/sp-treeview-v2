---
title: Plain HTML / JS
description: Use <sp-tree> and <sp-tree-select> with no framework and (optionally) no build step.
---

The elements are standard custom elements, so a static HTML page is all you
need. With a bundler, just `import '@sp-treeview/element'`. Without one, use an
import map:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script type="importmap">
    { "imports": {
      "lit": "https://esm.sh/lit@3",
      "@floating-ui/dom": "https://esm.sh/@floating-ui/dom@1",
      "@sp-treeview/core": "https://esm.sh/@sp-treeview/core@4.0.0-alpha.0",
      "@sp-treeview/element": "https://esm.sh/@sp-treeview/element@4.0.0-alpha.0"
    } }
  </script>
</head>
<body>
  <sp-tree id="tree" selection="multi" cascade searchable></sp-tree>
  <p id="out">No selection.</p>

  <script type="module">
    import '@sp-treeview/element'; // registers both elements

    const tree = document.getElementById('tree');

    // Object/function inputs are DOM *properties*, never attributes.
    tree.data = [
      { id: 'india', label: 'India', children: [
        { id: 'mh', label: 'Maharashtra', children: [
          { id: 'mum', label: 'Mumbai' },
          { id: 'pune', label: 'Pune' },
        ] },
      ] },
      { id: 'canada', label: 'Canada', hasChildren: true }, // lazy
    ];

    tree.loadChildren = (node) =>
      fetch(`/api/children/${node.id}`).then((r) => r.json());

    tree.addEventListener('sp-change', (e) => {
      const { checked, allSelected } = e.detail;
      document.getElementById('out').textContent = allSelected
        ? 'Everything selected'
        : checked.map((n) => n.label).join(', ') || 'No selection.';
    });
  </script>
</body>
</html>
```

## Attributes vs. properties

Primitive inputs are reflected attributes and can live in markup:

```html
<sp-tree selection="multi" cascade searchable show-all-node load-once></sp-tree>
```

`cascade` and `loadOnce` **default to `true`** — because they are boolean
attributes, turning them off must go through the property:

```js
tree.cascade = false;   // NOT: omit the attribute (that leaves the default true)
tree.loadOnce = false;
```

## Forms

`<sp-tree-select>` is form-associated. Its form value is a JSON array of
checked node ids:

```html
<form id="f">
  <sp-tree-select name="regions" selection="multi"></sp-tree-select>
  <button>Submit</button>
</form>
<script type="module">
  const fd = new FormData(document.getElementById('f'));
  fd.get('regions'); // e.g. '["mum","pune"]'
</script>
```

A full runnable page (three variants plus a themed section) lives in the repo
at [`examples/index.html`](https://github.com/srjn45/sp-treeview-v2/blob/master/examples/index.html).
