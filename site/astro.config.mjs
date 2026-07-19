import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GitHub Pages project site lives at https://srjn45.github.io/sp-treeview-v2
export default defineConfig({
  site: 'https://srjn45.github.io',
  base: '/sp-treeview-v2/',
  integrations: [
    starlight({
      title: 'sp-treeview',
      description: 'A framework-agnostic tree view for the web: a zero-dependency headless state engine plus native Web Components — <sp-tree> and <sp-tree-select> — for React, Vue, Svelte, Angular, or plain HTML.',
      logo: {
        light: './src/assets/sp-treeview-wordmark-light.svg',
        dark: './src/assets/sp-treeview-wordmark-dark.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/docs.css'],
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://srjn45.github.io/sp-treeview-v2/og-image.svg' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/srjn45/sp-treeview-v2' },
      ],
      sidebar: [
        { label: 'Start here', items: [
          { label: 'What is sp-treeview?', slug: 'start/what-is-sp-treeview' },
          { label: 'Install', slug: 'start/install' },
          { label: 'Quickstart', slug: 'start/quickstart' },
        ]},
        { label: 'Guides', items: [
          { label: 'Plain HTML / JS', slug: 'guides/plain-html' },
          { label: 'React', slug: 'guides/react' },
          { label: 'Vue 3', slug: 'guides/vue' },
          { label: 'Angular', slug: 'guides/angular' },
          { label: 'Svelte', slug: 'guides/svelte' },
          { label: 'Lazy loading', slug: 'guides/lazy-loading' },
          { label: 'Search & filtering', slug: 'guides/search-and-filtering' },
          { label: 'The select field', slug: 'guides/tree-select' },
          { label: 'Theming', slug: 'guides/theming' },
          { label: 'Headless core', slug: 'guides/headless-core' },
        ]},
        { label: 'Reference', items: [
          { label: '<sp-tree> API', slug: 'reference/sp-tree' },
          { label: '<sp-tree-select> API', slug: 'reference/sp-tree-select' },
          { label: 'TreeStore API', slug: 'reference/tree-store' },
          { label: 'Data model', slug: 'reference/data-model' },
          { label: 'Migrating from v3', slug: 'reference/migration' },
          { label: 'Contributing', slug: 'reference/contributing' },
        ]},
      ],
    }),
  ],
});
