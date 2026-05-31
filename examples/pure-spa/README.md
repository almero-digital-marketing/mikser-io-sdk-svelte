# pure-spa

Runtime-everything single-page app built on **`mikser-io-sdk-svelte`**.

Routes, views, and content are all resolved in the browser at runtime. There is no build step that bakes in content; everything comes live from the mikser backend.

## What it shows

- `useMikserPages` to build a live array of catalog routes
- A tiny pushState-based path router (`router.svelte.js`) — no extra router package
- A `route-mapping` module that maps `meta.layout` to a view component
- Views for each layout: `page`, `article`, `product`, `landing`
- Live updates: edit content in mikser and the SPA reflects it without a reload

## Run

```bash
npm install
npm run dev
```

The app reads `VITE_MIKSER_URL` (default `http://localhost:3001`).

## How it works

1. `main.js` mounts `App.svelte` onto `#app`.
2. `App.svelte` creates a mikser client, calls `setMikserClient(client)` to share it via Svelte context, and runs `useMikserPages` to get a live array of catalog routes.
3. A pushState router (`router.svelte.js`) exposes the current path as a rune; clicking any `<a href>` is intercepted and routed without a full page load.
4. The current path is matched first against static routes (`Home`, `ArticleIndex`, `ProductIndex`), then against catalog routes. The matched view is rendered with the document `id` as a prop.
5. Layout views (`ArticleView`, `ProductView`, etc.) call `useDocument(() => id)` to fetch and subscribe to that one document.
6. Index views (`ArticleIndex`, `ProductIndex`) call `useDocuments(() => query)` to query collections live.
7. When content changes in mikser, the SDK pushes updates and the views re-render.

## Takeaway

A SPA can defer everything — routing and content — to runtime. The mikser catalog is the single source of truth, and the SDK keeps the browser in sync live. Svelte 5's runes handle the reactivity; the only dependency beyond `svelte` is the SDK pair (`mikser-io-sdk-api` + `mikser-io-sdk-svelte`).
