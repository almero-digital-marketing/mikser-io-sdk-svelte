# hybrid-ssg

SvelteKit project: **prerendered public side + live SPA editor** from one mikser catalog.

## What it shows

- `generateMikserRoutes` inside a SvelteKit `entries()` hook to enumerate every catalog route at build time
- `+page.server.js` `load()` that fetches each document from the catalog during prerender
- A single catch-all `[...path]/+page.svelte` that dispatches by `meta.layout` to a view component
- A non-prerendered `/admin` route running as a runtime SPA that uses `useDocument` / `useDocuments` against the same backend
- `@sveltejs/adapter-static` with a fallback page so the admin SPA coexists with the static build

## Run

```bash
# Live dev (both public + admin run with SvelteKit dev server)
npm install
npm run dev

# Or: full static build, then preview
npm run build
npm run preview
```

The dev server reads `PUBLIC_MIKSER_URL`; the build script reads `MIKSER_URL`. Both default to `http://localhost:3001`.

## How it works

### Public side (static)

1. `src/routes/[...path]/+page.server.js` exports `entries()` — uses `generateMikserRoutes` to ask mikser for every published `meta.route`.
2. For each path SvelteKit calls `load({ params })` — which fetches that one document from the catalog.
3. `+page.svelte` picks a view by `meta.layout` from `src/lib/route-mapping.js` and renders it.
4. The whole thing is baked into static HTML at build time. Once deployed, the public side never talks to mikser.

### Admin side (live SPA)

1. `src/routes/admin/+page.js` opts out of prerender (`prerender = false`, `ssr = false`).
2. `+page.svelte` calls `setMikserClient(client)` and uses `useDocuments` + `useDocument` against the live backend.
3. `adapter-static` serves admin via the SPA fallback (`admin.html`), so the static deploy still hosts it cleanly.

### Why split?

The public site needs to be fast, cacheable, and host-anywhere. The editor needs live feedback as content changes. Mikser is the same backend for both — only the rendering shape differs per surface.

## Takeaway

A SvelteKit app can mix prerender and SPA cleanly: most routes bake to static HTML against the live catalog at build time; a few opt out and stay live for editor/admin views. The SDK works the same way on both sides — the only difference is whether `useDocument` runs at build (via `client.list()` in `load()`) or at runtime.
