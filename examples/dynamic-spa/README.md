# Dynamic SPA — Svelte 5

A plain Svelte 5 SPA (no SvelteKit) for catalogs too large to enumerate at boot. One catch-all dispatch, per-navigation lookup, cache-backed first paint.

## When to pick this

- Content catalogs past ~5–10k routes — blogs with thousands of posts, large product catalogs, big knowledge bases, document archives.
- Any case where `/data/sitemap.json` would be over ~1–2 MB and dragging first paint.

For smaller catalogs (< 5k routes), [`examples/pure-spa`](../pure-spa) is the right choice — it pre-registers every route from the snapshot and gives an even faster cold-route experience.

For SvelteKit projects, the same shape works inside `src/routes/[...slug]/+page.svelte` — see the [SDK README's Scenario D section](../../README.md#d-dynamic-routes--for-catalogs-too-big-to-enumerate).

## What it shows

- **One catch-all dispatch.** `App.svelte` matches the current path against a tiny `staticRoutes` table (just `/` → `Home`); anything else falls through to `DocumentResolver.svelte`.
- **`useDocumentByRoute(() => router.path)`** in `DocumentResolver.svelte` — issues `GET /api/public/entities?meta.route=<currentPath>` and dispatches the matched document to the right view (`ArticleView` / `ProductView` / `LandingView` / `PageView`).
- **No `initialUrl`, no `useMikserPages`, no `data.catalog.sitemap` block.** The catalog is the route table — there's no separate index to maintain or load.
- **Live updates via SSE.** `useDocumentByRoute` wraps `client.live()` underneath, so an edit to the currently-displayed document updates the page without a refresh — same DX as pure-spa, just at scale.
- **`useDocuments` still works for known-shape queries** — the nav menu and Home's "Latest articles" list use it, with `fields` projections to keep the responses narrow.

## How the caching works

`useDocumentByRoute` issues a GET to `/api/public/entities?meta.route=...`. With `cache: true` on the public endpoint, mikser writes that response to disk as a side effect of serving it. The standard nginx failover config (see [mikser-io's caching docs](https://github.com/almero-digital-marketing/mikser-io/blob/main/documentation/caching.md)) serves the file directly on subsequent requests:

- **First visitor to a route:** SDK → mikser → response served + written to `out/api/public/entities/meta.route=%2F...&meta.published=true&limit=1.json`
- **Every subsequent visitor:** SDK → proxy serves the cached file (mikser idle)
- **Catalog change:** entire cache directory cleared, re-warms on demand

Effectively per-route ISR — the cache is built by real user traffic.

## Project structure

```
dynamic-spa/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js                ← mount(App, { target })
    ├── App.svelte             ← Nav + tiny static-routes table + catch-all DocumentResolver
    ├── router.svelte.js       ← reactive router rune (path + navigate())
    ├── components/
    │   └── Nav.svelte         ← useDocuments({ filter: meta.nav })
    └── views/
        ├── Home.svelte        ← hand-coded landing, "Latest 6 articles" via useDocuments
        ├── DocumentResolver.svelte   ← useDocumentByRoute + dispatch
        ├── ArticleView.svelte
        ├── ProductView.svelte
        ├── LandingView.svelte
        ├── PageView.svelte
        └── NotFound.svelte
```

No `route-mapping.js` — there's no separate route table to maintain. The dispatch table lives inline in `DocumentResolver.svelte` since it's the only consumer.

## Running it

```bash
# In a separate terminal — start the shared mikser backend
cd ../mikser-content
npm install
npm run dev

# Back here — install + run
npm install
echo "VITE_MIKSER_URL=http://localhost:3001" > .env
npm run dev
```

Visit `http://localhost:5173`. Navigate to any document — `/en/articles/welcome`, `/en/products/desk-lamp`, etc. — and the catch-all kicks in: `useDocumentByRoute` resolves the catalog entry, the matching view renders.

## Production note

The cache-backed first paint only works when a reverse proxy is fronting mikser and configured to serve the cached files on upstream failure. In dev mode you're hitting mikser directly every time. See [the caching docs](https://github.com/almero-digital-marketing/mikser-io/blob/main/documentation/caching.md) for the working nginx config.

## Diffs vs. pure-spa

If you're already familiar with [`examples/pure-spa`](../pure-spa), here's what changed:

| | pure-spa (Scenario A) | dynamic-spa (Scenario D) |
|---|---|---|
| Client setup | `entities('public', { initialUrl: '/data/sitemap.json' })` | `entities('public')` — no snapshot |
| Routing | `useMikserPages` builds a live `pages.items[]` table | One catch-all `DocumentResolver` |
| `route-mapping.js` | Has it, maps catalog entries to `{ path, id, component }` for the routes table | Doesn't exist — dispatch happens inline in DocumentResolver |
| `mikser.config.js` | Has `data.catalog.sitemap` block | Can drop the block — no snapshot consumed |
| First paint cost | One CDN-cacheable snapshot fetch | One API roundtrip per unique cold route (cached thereafter) |
| Scaling | Snapshot size grows linearly with catalog | First paint cost constant per route, independent of catalog size |
