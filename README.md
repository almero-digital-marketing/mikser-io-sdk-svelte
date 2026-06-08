# mikser-io-sdk-svelte

**Wire a Svelte 5 / SvelteKit app to a [mikser-io](https://github.com/almero-digital-marketing/mikser-io) content backend in ~10 lines.** Content stays as `.md` and `.yml` files on disk — diffable, grep-able, copy-anywhere. The runes-backed reactives below give you live updates over SSE, typed access to layout-shaped front-matter, multilingual URL resolution, asset metadata, and semantic search.

| What you get | Reads as |
|---|---|
| **Live content** | `const article = useDocument(() => id)` — `article.document` updates as the file changes |
| **Live lists** | `const list = useDocuments(() => ({ filter, sort, fields }))` |
| **Multilingual URLs** | `href('/about')` → `/en/about` or `/fr/a-propos` per locale |
| **Hreflang + switchers** | `useAlternates({ route })` |
| **Asset metadata** | `image('/assets/hero.jpg')` → `{ src, srcset, width, height, alt }` |
| **Semantic search** | `useSimilar(store, () => query)` with built-in debounce + stale-discard |
| **Live nav data** | `useMikserPages({ mapPage })` — for menus, sitemaps, search indexes |
| **Build-time routes** | `generateMikserRoutes()` for SvelteKit's `entries()` prerender hook |

**SvelteKit-friendly by default.** Mikser supplies the data, SvelteKit owns the routing — no programmatic router to displace. A catch-all `+page.svelte` with `useDocument` resolves the entity for the current URL; `entries()` enumerates which paths to prerender. The split matches SvelteKit's own conventions.

**One mental model across every rendering shape** — pure Svelte SPA, hybrid SvelteKit (prerendered public + live `/admin` editor served via adapter-static's fallback), or mikser-rendered HTML with Svelte 5 `mount()`-ed islands. Same reactives, different surface. See [`examples/`](./examples) for the three patterns side-by-side.

**Typed at the seam.** Pair with [`mikser-io-schemas`](https://github.com/almero-digital-marketing/mikser-io-schemas) to author Zod schemas alongside your content; `useDocument<{ meta: MetaByLayout<'article'> }>(() => id)` then carries the front-matter shape straight into your templates.

Pairs with [`mikser-io-sdk-api`](https://github.com/almero-digital-marketing/mikser-io-sdk-api) — that package handles transport (HTTP + SSE); this one wraps it in Svelte idioms.

## Install

```bash
npm install mikser-io-sdk-svelte mikser-io-sdk-api
```

Peer deps: `svelte` ^5.

## Quick start

```svelte
<!-- src/routes/+layout.svelte -->
<script>
    import { setMikserClient, provideHrefIndex, provideAssetIndex } from 'mikser-io-sdk-svelte'
    import { createClient } from 'mikser-io-sdk-api'
    import { PUBLIC_MIKSER_URL } from '$env/static/public'

    const documents = createClient({ baseUrl: PUBLIC_MIKSER_URL }).entities('public')
    setMikserClient(documents)
    provideHrefIndex({ defaultLang: 'en' })
    provideAssetIndex()

    let { children } = $props()
</script>

{@render children()}
```

```svelte
<!-- src/routes/articles/[slug]/+page.svelte -->
<script>
    import { useDocument } from 'mikser-io-sdk-svelte'
    import { page } from '$app/state'

    const article = useDocument(() => `/content/blog/${page.params.slug}`)
</script>

{#if article.loading}
    Loading…
{:else if article.document}
    <h1>{article.document.meta.title}</h1>
    {@html article.document.content}
{:else}
    Not found.
{/if}
```

## Surface

| Function | What it does |
|---|---|
| `setMikserClient(client)` | Expose the entities client via Svelte context. Call once in a top-level component. |
| `useMikserClient()` | Read the client. Useful for ad-hoc calls (`urlFor`, `render`). |
| `useDocument<T>(getId, options?)` | Live single-document reactive. Pass `() => id` for re-subscription on change. |
| `useDocuments<T>(getQuery, options?)` | Live list reactive. Pass `() => query` for re-subscription on change. |
| `useDocumentByRoute<T>(getPath, options?)` | Live single-document lookup by URL route — for the catch-all `[...path]/+page.svelte` in dynamic-routes setups. See "Dynamic routes" below. |
| `useMikserPages({ mapPage })` | Live reactive array of page entries — menus, sitemaps, search. |
| `generateMikserRoutes({ mapRoute })` | Async one-shot enumerator — for SvelteKit's `entries()` prerender hook. |
| `provideHrefIndex(options?)` + `useHref(lang?)` | Multilingual href abstraction — logical references resolve to per-locale URLs. |
| `useAlternates({ route, languages? })` | Alternates for hreflang tags and language switchers. |
| `provideAssetIndex(options?)` + `useAsset()` | Resolve asset references to URL + dimensions + srcset. |
| `setMikserVectorClient(client)` + `useMikserVectorClient()` | Bridges `mikser-io-sdk-vector` into Svelte context. |
| `useSimilar<T>(store, getQuery, options?)` | Live semantic search with debounce + stale-result discard. |

## Reactivity model — read this first

The SDK uses Svelte 5 runes (`$state`, `$effect`, `$derived`) internally. From the outside the API looks like plain functions that return objects, but those objects' properties are reactive — Svelte tracks their reads inside templates and `$effect` blocks.

**Reading state inside a template:** just use dot-access — Svelte tracks it.

```svelte
<script>
    const article = useDocument(() => entityId)
</script>

{article.document?.meta.title}    <!-- ← reactive: re-renders on update -->
```

**Re-subscribing on upstream change:** pass a getter, not a value.

```svelte
<!-- ✗ Won't re-subscribe when entityId changes -->
useDocument(entityId)

<!-- ✓ Re-subscribes whenever entityId changes -->
useDocument(() => entityId)
```

The getter form lets the SDK's internal `$effect` track whatever rune state you read inside it, so the subscription re-establishes when that state changes. Passing a bare value captures a one-time snapshot.

## Scenarios — picking the right shape for your project

Four common shapes. Each makes a different trade between SEO, build complexity, and catalog scale. Pick before you start; mixing them mid-project is painful.

SvelteKit owns routing via the filesystem, so the SDK doesn't ship a programmatic router — the scenarios below differ mainly in *how* the catch-all `+page.svelte` resolves content and *which* SvelteKit pipeline produces the output.

> ### 📦 Runnable starter projects
>
> Each scenario ships as a complete starter under [`examples/`](./examples) — full SvelteKit config, `package.json`, full source tree, its own README explaining how to run it. Clone and modify rather than translate the snippets below into project structure.
>
> | Folder | What's in it |
> |---|---|
> | **[`examples/mikser-content`](./examples/mikser-content)** | **The shared content server** — a standalone mikser project that supplies the catalog to the three Svelte apps below. Start it first. |
> | **[`examples/pure-spa`](./examples/pure-spa)** (scenario A) | Vite + Svelte 5 (no SvelteKit) — a runtime-everything SPA pattern, rare but supported |
> | **[`examples/dynamic-spa`](./examples/dynamic-spa)** (scenario D) | Same shape as `pure-spa` but with a catch-all + `useDocumentByRoute` |
> | **[`examples/hybrid-ssg`](./examples/hybrid-ssg)** (scenario B) | SvelteKit `entries()` + prerender, plus a live `/admin` SPA from one catalog |
> | **[`examples/islands`](./examples/islands)** (scenario C) | Multi-entry Vite build, Svelte islands mounting onto mikser-rendered HTML |

### A) Pure SPA — runtime everything, live everywhere

**When:** Editor UIs, admin dashboards, internal apps. SEO doesn't matter. You want the fastest dev loop and the lowest build complexity. In the SvelteKit world this is **SvelteKit with CSR-only output** (`export const prerender = false`) — every route is resolved at runtime from the live mikser catalog. (For Svelte without SvelteKit at all, see `examples/pure-spa`.)

**How it works:** A catch-all SvelteKit route does the dispatch. `data.catalog` on the client points at the `data` plugin's static snapshot so first paint loads from disk (CDN-cacheable, no API roundtrip), then live SSE keeps the catalog current. The catch-all looks up the current path against the snapshot, then renders the matching view component.

**`src/lib/mikser.js` — single client with snapshot URL:**

```js
import { createClient } from 'mikser-io-sdk-api'
import { PUBLIC_MIKSER_URL } from '$env/static/public'

// `data.catalog` points at the static snapshot the data plugin writes
// (out/data/sitemap.json). The SDK loads it on first paint — fast,
// CDN-cacheable, no API roundtrip — then opens a live SSE subscribe
// on the same /public endpoint for incremental updates.
export const documents = createClient({ baseUrl: PUBLIC_MIKSER_URL })
    .entities('public', { data: { catalog: 'sitemap', entities: 'page' } })
```

**`src/routes/+layout.svelte` — register the client:**

```svelte
<script>
    import { documents } from '$lib/mikser.js'
    import { setMikserClient } from 'mikser-io-sdk-svelte'
    setMikserClient(documents)
    let { children } = $props()
</script>

{@render children()}
```

**`src/routes/[...slug]/+page.svelte` — catch-all view dispatch:**

```svelte
<script>
    import { page } from '$app/state'
    import { useDocuments } from 'mikser-io-sdk-svelte'
    import ArticleView from '$lib/views/ArticleView.svelte'
    import PageView    from '$lib/views/PageView.svelte'
    import NotFound    from '$lib/views/NotFound.svelte'

    const route = $derived('/' + (page.params.slug ?? ''))

    // Look up the route in the catalog. With data.catalog set on the
    // client in $lib/mikser.js, the first list() consults the static
    // /data/sitemap.json snapshot before falling back to a fresh API
    // call — so the first paint matches by route without an API trip.
    const list = useDocuments(() => ({
        filter: { 'meta.route': route, 'meta.published': true },
        fields: ['id', 'destination', 'meta.route', 'meta.component'],
    }))

    const viewForComponent = { article: ArticleView, page: PageView }
</script>

{#if list.loading}
    Loading…
{:else if list.documents[0]}
    {@const doc = list.documents[0]}
    {@const View = viewForComponent[doc.meta?.component] ?? PageView}
    <View id={doc.id} />
{:else}
    <NotFound />
{/if}
```

**Trade-offs:** Fastest to set up. Worst for SEO (the public-facing HTML is empty until JS loads). Initial boot pays the snapshot fetch (~50–200ms typical, CDN-cacheable).

> **📦 Full starter project:** **[`examples/pure-spa`](./examples/pure-spa)** — Svelte 5 (no SvelteKit) runtime-everything pattern. The SvelteKit variant uses the same client + catch-all shape inside SvelteKit's routes/.

---

### B) Hybrid — SSG for public, SPA-with-live for editor

**When:** Marketing sites, blogs, documentation, any content site that needs SEO. The typical agency project.

**The idea:** SvelteKit's prerender pipeline handles the public side — `entries()` enumerates every published document, `load()` fetches the body, the build emits static HTML per route. A separate `/admin` SPA uses the live SDK (scenario A pattern) for editorial preview against the same mikser server.

**`src/routes/[...slug]/+page.server.js` — prerender + per-route load:**

```js
import { generateMikserRoutes } from 'mikser-io-sdk-svelte'
import { documents } from '$lib/mikser.js'
import { routeFor } from '$lib/route-mapping.js'

export const prerender = true

// Enumerate every published, component-having document.
// generateMikserRoutes calls listAll(), which consults the
// `data.catalog` snapshot ($lib/mikser.js → /data/sitemap.json) before
// falling back to a fresh list().
export async function entries() {
    const routes = await generateMikserRoutes({
        client: documents,
        mapRoute: document => {
            const path = routeFor(document)
            return path ? { slug: path.replace(/^\//, '') } : null
        },
    })
    return routes.filter(r => r && r.slug !== '')
}

// Fetch the document for the matched path.
export async function load({ params }) {
    const target = '/' + params.slug
    const { items } = await documents.list({
        filter: {
            $or: [
                { 'meta.route': target },
                { destination: { $regex: `^${target.replace(/\/$/, '')}(/index)?\\.html?$` } },
            ],
            'meta.published': true,
        },
        limit: 1,
    })
    return { document: items[0] || null }
}
```

**`src/routes/[...slug]/+page.svelte` — server-rendered shell:**

```svelte
<script>
    import { viewForComponent } from '$lib/route-mapping.js'
    import PageView from '$lib/views/PageView.svelte'
    let { data } = $props()
    const View = $derived(viewForComponent[data.document?.meta?.component] ?? PageView)
</script>

{#if data.document}
    <View document={data.document} />
{:else}
    <p>Not found.</p>
{/if}
```

**`src/routes/admin/+page.svelte` — live editor SPA (scenario A pattern):**

```svelte
<script>
    import { setMikserClient, useDocuments, useDocument } from 'mikser-io-sdk-svelte'
    import { documents } from '$lib/mikser.js'
    import { viewForComponent } from '$lib/route-mapping.js'

    setMikserClient(documents)

    let selectedId = $state(null)
    const all = useDocuments(() => ({
        filter: { 'meta.published': true, 'meta.component': { $exists: true } },
        sort: { 'meta.route': 1 },
        fields: ['id', 'destination', 'meta'],
    }))
    const selected = useDocument(() => selectedId)
</script>

<aside>
    {#each all.documents as document (document.id)}
        <button onclick={() => (selectedId = document.id)}>
            {document.meta?.title}
        </button>
    {/each}
</aside>
<section>
    {#if selected.document}
        {@const View = viewForComponent[selected.document.meta?.component]}
        <View document={selected.document} />
    {/if}
</section>
```

**Trade-offs:** SvelteKit handles two output modes from one codebase. Public side is SEO-correct, CDN-friendly. Editor stays live with SSE. Pre-build sequencing matters — mikser must be running when `vite build` invokes `entries()`.

> **📦 Full starter project:** **[`examples/hybrid-ssg`](./examples/hybrid-ssg)** — `src/lib/mikser.js` is the load-bearing file, shared between catch-all prerender, root +page, and admin SPA.

---

### C) Mikser-rendered HTML + Svelte islands

**When:** Content-heavy sites where most pages are pure content (mikser renders them perfectly) but a few features need interactivity (search box, contact form, filters, live counts).

**The idea:** Mikser is responsible for the HTML. Svelte is just an enhancement layer that mounts onto specific DOM nodes the server-rendered HTML emits. No SvelteKit involved — the URLs are real URLs served as static files.

**Public site:** `mikser build` produces `out/`. Deploy `out/` as static. The HTML includes mount points for the Svelte islands:

```html
<!-- documents/en/search.md → rendered via layouts/page.html.hbs -->
<article>
    <h1>{{meta.title}}</h1>
    <div id="search-island" data-endpoint="public"></div>
</article>
```

**Island bundle:** A tiny multi-entry Vite build, one entry per island. Each entry finds its mount node, reads `data-*` attributes for config, mounts a Svelte component:

```js
// src/islands/search.js
import { mount } from 'svelte'
import { createClient } from 'mikser-io-sdk-api'
import { setMikserClient } from 'mikser-io-sdk-svelte'
import Search from './Search.svelte'

document.querySelectorAll('[id^="search-island"]').forEach(el => {
    const documents = createClient({ baseUrl: '/' })   // same-origin
        .entities(el.dataset.endpoint)
    // setMikserClient must run inside the mount — Svelte context is
    // component-scoped, not module-scoped.
    mount(Search, {
        target: el,
        props: { client: documents },
    })
})
```

```svelte
<!-- src/islands/Search.svelte -->
<script>
    import { setMikserClient, useDocuments } from 'mikser-io-sdk-svelte'
    let { client } = $props()
    setMikserClient(client)

    let q = $state('')
    const results = useDocuments(() => ({
        filter: q ? { 'meta.title': { $regex: q, $options: 'i' } } : {},
        fields: ['id', 'meta.title', 'meta.summary', 'meta.route'],
        limit: 10,
    }))
</script>

<input bind:value={q} placeholder="Search…" />
<ul>
    {#each results.documents as doc (doc.id)}
        <li><a href={doc.meta?.route}>{doc.meta?.title}</a></li>
    {/each}
</ul>
```

**Trade-offs:** Best performance (static HTML + small Svelte bundle, lazy-loaded). Simplest deployment (just files). But SvelteKit is out of the picture — the URL structure is mikser's responsibility, and you don't get SvelteKit conveniences like `goto`, form actions, page transitions across the static pages.

> **📦 Full starter project:** **[`examples/islands`](./examples/islands)** — search, booking, cart-counter islands plus a simulated mikser-rendered HTML page showing where they mount.

---

### D) Dynamic routes — for catalogs too big to enumerate

**When:** A content catalog past the ~5k–10k route mark where loading every route into a snapshot at boot stops making sense — large blogs, e-commerce catalogs, knowledge bases, document archives.

**The idea:** Stop enumerating routes. The SvelteKit catch-all already exists from scenario A; just drop `data.catalog` and use `useDocumentByRoute(path)` to resolve the document at navigation time. The api plugin's per-query disk cache turns each unique route into an on-demand static file: the first user hits mikser, subsequent users get the cached response served by the reverse proxy. Effectively per-route ISR with no extra config.

**`src/lib/mikser.js` (Mode 2)** — drop `data.catalog`:

```js
import { createClient } from 'mikser-io-sdk-api'
import { PUBLIC_MIKSER_URL } from '$env/static/public'

export const documents = createClient({ baseUrl: PUBLIC_MIKSER_URL })
    .entities('public')
```

Also remove the `data.catalog.sitemap` block from `mikser-content/mikser.config.js` — no snapshot to publish.

**`src/routes/[...slug]/+page.svelte` (Mode 2)** — replace the inline two-step lookup with `useDocumentByRoute`:

```svelte
<script>
    import { page } from '$app/state'
    import { useDocumentByRoute } from 'mikser-io-sdk-svelte'
    import ArticleView from '$lib/views/ArticleView.svelte'
    import PageView    from '$lib/views/PageView.svelte'
    import NotFound    from '$lib/views/NotFound.svelte'

    const result = useDocumentByRoute(() => page.url.pathname)
    const viewForComponent = { article: ArticleView, page: PageView }
</script>

{#if result.loading}
    Loading…
{:else if result.document}
    {@const View = viewForComponent[result.document.meta?.component] ?? PageView}
    <View id={result.document.id} />
{:else}
    <NotFound />
{/if}
```

**How the caching works.** `useDocumentByRoute` issues a request like `GET /api/public/entities?meta.route=/en/about&meta.published=true&limit=1&cache=4f3a2c1d8e9b6f7a`. The SDK appends `cache=<sha256-prefix>` automatically — the same hash the server uses for the on-disk filename. With `cache: true` on the public endpoint, mikser writes the response to `out/api/public/entities/4f3a2c1d8e9b6f7a.json`. The standard nginx config (`try_files /api/public/entities/$arg_cache.json @proxy`; see [mikser-io's caching docs](https://github.com/almero-digital-marketing/mikser-io/blob/main/documentation/caching.md)) serves the file directly on subsequent requests via the client-provided hint, no Lua needed:

- **First visitor to a route:** SDK → mikser → response served + written to disk
- **Every subsequent visitor:** SDK → proxy serves the cached file (mikser idle)
- **Catalog change:** entire cache directory cleared, re-warms on demand

Effectively per-route ISR — the cache is built by real user traffic.

**Trade-offs:** First paint on a cold route pays one API roundtrip — slower than scenario A's pre-loaded snapshot, faster than A's initial snapshot fetch for repeat visits to cached routes. Doesn't scale down well to small catalogs (you're paying the resolver tax for routes you could have enumerated for free) but scales up beautifully — works the same at 10k routes as at 10M.

When to pick D over A: roughly when `/data/sitemap.json` would emit more than ~1–2 MB, or you have more than ~5k routes. The snapshot is dragging first paint down more than the resolver does.

> **📦 Full starter project:** **[`examples/dynamic-spa`](./examples/dynamic-spa)** — plain Svelte 5 (no SvelteKit), parallels `pure-spa` but with the catch-all + `useDocumentByRoute` pattern. SvelteKit users get the same shape inside their `[...slug]/+page.svelte` — see the Scenario D section.

---

### Picking between them

| Question | A (SPA) | B (Hybrid SSG) | C (Islands) | D (Dynamic SPA) |
|---|---|---|---|---|
| Do you need SEO? | No | **Yes** | **Yes** | No |
| Is most of the page interactive? | **Yes** | Maybe | No | **Yes** |
| Is content mostly static? | No | Yes | **Yes** | No |
| Editor + admin in same app? | **Yes** | Editor is the SPA half | Separate admin app | **Yes** |
| Build complexity tolerance | Low | Medium | Low | Low |
| Mikser plugins (post-pdf, post-mjml) used? | No | Maybe | **Yes** | No |
| SvelteKit conventions used? | Yes (CSR) | **Yes** (prerender) | No — plain Vite islands | Yes (catch-all) |
| Catalog size | < 5k routes | any | any | > 5k routes |

**Rule of thumb for an agency client site:** start with **C** (islands) for the public site if the content is mostly static, **B** (hybrid SSG) if there's significant interactivity, **A** (pure SPA) only for the admin app. Pick **D** when A would otherwise be your choice but the catalog is past the snapshot ceiling. A/D and B/C often coexist in the same project — the admin is always SPA-shaped; the public face is the project-by-project decision.

### When to use which function

| Function | Best for | Avoid when |
|---|---|---|
| `client.list()` directly | Build-time (in `entries()` / `load()`), SSR (no live updates needed) | Inside components that need to react to changes |
| `useDocument()` / `useDocuments()` | Components in any scenario | Plain JS files (use the SDK directly) |
| `useDocumentByRoute()` | Scenario D catch-all view — resolve the current path to a document | Scenarios A/B (you have the entity id; use `useDocument`) |
| `useMikserPages` | Live navigation menus, sitemaps, tag indexes in scenarios A/B/D | Scenario C (no SvelteKit context for nav) |
| `live()` underneath all the rest | Always — the others wrap it | — |
| `generateMikserRoutes` | Scenario B `entries()` hook | Scenarios A, C, D |
| `useHref` + `useAsset` | Any scenario with Svelte components | Mikser-rendered HTML (use the render-href plugin server-side instead) |

## Multilingual `useHref` / `useAlternates`

### The pattern, and why it matters

In a multilingual site the *same* logical page exists at different URLs per language: `/about` is served at `/en/about` and `/fr/a-propos`. Hard-coding those URLs into links couples every component to the routing scheme and breaks the moment a translation's slug changes.

`useHref` decouples the two. You link to a **logical reference** (`/about`) and the SDK resolves it to the **deployed URL** for the current (or requested) language. The mapping comes from three front-matter fields on each document:

| Front-matter field | Meaning | Example |
|---|---|---|
| `meta.href` | The logical reference — identical across all translations of a page | `/about` |
| `meta.lang` | Which language this particular document represents | `en` |
| `meta.route` | The actual deployed URL — what `useHref` returns | `/en/about` |

`provideHrefIndex()` builds a live `href → { lang → url }` index from the catalog (kept current via SSE). `useHref(lang)` reads it. Resolution falls back gracefully: requested language → `default` bucket → any available language → the input reference unchanged (so a broken reference stays visible rather than silently becoming `undefined`).

### Setup

```svelte
<!-- src/routes/+layout.svelte -->
<script>
    import { provideHrefIndex } from 'mikser-io-sdk-svelte'
    provideHrefIndex({ defaultLang: 'en' })
</script>
```

### Use

```svelte
<script>
    import { useHref, useAlternates } from 'mikser-io-sdk-svelte'
    import { locale } from '$lib/i18n'        // your locale rune / store
    import { page } from '$app/state'

    const { href } = useHref(() => locale.current)
    const alts = useAlternates({
        route: () => page.url.pathname,
        languages: ['en', 'fr', 'bg'],
    })
</script>

<a href={href('/about')}>About</a>
<a href={href('/about', 'fr')}>Voir en français</a>

<!-- Language switcher -->
{#each alts.alternates as { lang, url } (lang)}
    <a href={url}>{lang}</a>
{/each}
```

`defaultLang` passed to `useHref` may be a string or a getter (`() => locale.current`) so the resolved language tracks your i18n state reactively.

### hreflang vs. switcher — the `languages` toggle

The `languages` option on `useAlternates` toggles two behaviours:

- **Omitted** — `alternates` contains only languages that *actually exist* for the current page. Right for SEO `hreflang` tags: don't advertise translations you don't have.

  ```svelte
  <script>
      import { page } from '$app/state'
      import { useAlternates } from 'mikser-io-sdk-svelte'
      const seo = useAlternates({ route: () => page.url.pathname })
  </script>

  <svelte:head>
      {#each seo.alternates as { lang, url } (lang)}
          <link rel="alternate" hreflang={lang} href={url} />
      {/each}
  </svelte:head>
  ```

- **Provided** (array or getter) — `alternates` contains one entry per requested language, falling back through `href()`'s resolution chain when a real translation is missing. Right for a language switcher: show every locale the app supports, even if a given page isn't translated yet.

In both cases the current page's own language is excluded from `alternates` (it's what `current` is for).

## Asset resolution

```svelte
<!-- provide once, near the root -->
<script>
    import { provideAssetIndex } from 'mikser-io-sdk-svelte'
    provideAssetIndex()
</script>
```

```svelte
<!-- use anywhere below -->
<script>
    import { useAsset } from 'mikser-io-sdk-svelte'
    const { image } = useAsset()
</script>

{#if image('/assets/hero.jpg')}
    <img {...image('/assets/hero.jpg')} />
{/if}
```

`image()` returns `{ src, width, height, srcset, alt }` — Svelte uses lowercase HTML attribute names, so `srcset` not `srcSet`. `asset()` returns the full record (`url` + dimensions + raw `meta`). Both return `null` for unresolved references, so branch on that.

## References & inline expansion

Reference fields written as `$author: /authors/dick` (per [ADR-0007](https://github.com/almero-digital-marketing/mikser-io/blob/main/documentation/decisions/0007-references-declaration-and-expansion.md)) arrive on the wire as bare href strings — `document.meta.author === '/authors/dick'`. Two ways to turn them into entity objects, picked by whether you want the deep data to stay live.

**Chained `useDocument`** — each level stays live independently. Updates to the author propagate without re-fetching the article. Best when both layers update independently.

```svelte
<script>
    import { useDocument } from 'mikser-io-sdk-svelte'

    let { id } = $props()
    const article = useDocument(() => id)
    const author  = useDocument(() => article.document?.meta.author)
</script>

{#if article.document && author.document}
    <article>
        <h1>{article.document.meta.title}</h1>
        <p>By {author.document.meta.name}</p>
    </article>
{/if}
```

**`expand` on `useDocument` / `useDocuments`** — the initial snapshot arrives with refs already resolved to entity objects. Best when you'd otherwise pay N round-trips on first paint (a multi-hop chain like `author.organization`, or arrays of refs like `sections.*.image`).

```svelte
<script>
    import { useDocument } from 'mikser-io-sdk-svelte'

    let { id } = $props()

    // One round-trip: article + author + author.organization + hero,
    // all inlined and ready to render.
    const article = useDocument(() => id, {
        expand: ['author.organization', 'hero'],
    })
</script>

{#if article.document}
    <article>
        <h1>{article.document.meta.title}</h1>
        <p>
            By {article.document.meta.author.meta.name}
             — {article.document.meta.author.meta.organization.meta.name}
        </p>
        <img
            src={article.document.meta.hero.meta.url}
            alt={article.document.meta.hero.meta.alt}
        />
    </article>
{/if}
```

For lists:

```svelte
<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    let { authorId } = $props()

    // All articles by this author with each article's hero inlined.
    const articles = useDocuments(() => ({
        filter: { 'meta.component': 'article', 'meta.author': authorId },
        sort:   { 'meta.date': -1 },
        expand: ['hero'],
    }))
</script>

<ul>
    {#each articles.documents as a (a.id)}
        <li>
            {#if a.meta.hero}
                <img src={a.meta.hero.meta.url} alt={a.meta.hero.meta.alt} />
            {/if}
            <h2>{a.meta.title}</h2>
        </li>
    {/each}
</ul>
```

**Path forms:** dot-notation walks expanded entities (`author.organization`); `*` iterates `$`-keyed arrays (`sections.*.image`); both canonical (`$author`) and normalized (`author`) segments are accepted.

**Server caps** default to `maxDepth: 5`, `maxPaths: 20`, `maxResolved: 100` per request — configurable via `api.expand.{...}` in `mikser.config.js`. Exceeding any cap surfaces as a `MikserError` with `status === 422` on the underlying call.

**SSE deltas stay expanded.** Both the initial snapshot AND every forward update emit fully-expanded entities. The api plugin's subscribe handler registers an engine-level `runtime.refs.subscribeGraph` against the subscription's filter + expand; mutations to *any* entity within the expansion graph (the root, the author, the author's organization, …) trigger a re-emit with the freshly-resolved tree. Reactive consumers see consistent expanded data across the lifetime of the subscription.

For ad-hoc one-shot reads that don't need to participate in the SSE subscription — sitemap builders, SSG enumeration, AI agent calls — drop to the underlying `mikser-io-sdk-api` client:

```js
import { useMikserClient } from 'mikser-io-sdk-svelte'
const client = useMikserClient()
const { items } = await client.entities('public').list({
    filter: { id },
    expand: ['author.organization', 'hero'],
})
```

Missing targets or cycles silently leave the ref as a string at the deepest position — same convention as the underlying api, per ADR-0007 B6.

## Semantic search — `setMikserVectorClient` + `useSimilar`

Bridges `mikser-io-sdk-vector` into Svelte. Separate context slot from `setMikserClient` so projects without semantic search don't have to install the vector package. `useSimilar` handles debounce + stale-result discard so a fast-typing user doesn't see older results clobber newer ones.

```svelte
<!-- src/routes/+layout.svelte -->
<script>
    import { setMikserClient, setMikserVectorClient } from 'mikser-io-sdk-svelte'
    import { createClient } from 'mikser-io-sdk-api'
    import { createClient as createVectorClient } from 'mikser-io-sdk-vector'
    import { PUBLIC_MIKSER_URL } from '$env/static/public'

    setMikserClient(createClient({ baseUrl: PUBLIC_MIKSER_URL }).entities('public'))
    setMikserVectorClient(createVectorClient({ baseUrl: PUBLIC_MIKSER_URL }))

    let { children } = $props()
</script>

{@render children()}
```

```svelte
<!-- src/lib/SearchBox.svelte -->
<script>
    import { useSimilar } from 'mikser-io-sdk-svelte'

    let query = $state('')
    const search = useSimilar('documents', () => query, {
        limit:     10,
        debounce:  200,    // ms after the last keystroke before firing
        minLength: 2,      // skip the request below this length
    })
</script>

<input bind:value={query} placeholder="Search…" />
{#if search.loading}<p>Searching…</p>{/if}
<ul>
    {#each search.results as hit (hit.id)}
        <li>
            <a href={hit.id}>{hit.data?.title}</a>
            <small>distance: {hit.distance.toFixed(3)}</small>
        </li>
    {/each}
</ul>
```

- **`search.results`** is reactive via the getter pattern (same as `useDocument`). Read it directly in templates.
- **`search.loading`** is true only while a request is in flight, not during the debounce wait. Right for a spinner indicator.
- **`search.error`** is populated when `findSimilar()` rejects.
- **`search.refresh()`** forces a fresh request against the current query — useful after the vector store has been updated server-side.

`mikser-io-sdk-vector` is an **optional** runtime dependency — this SDK doesn't import it. Install only if you use semantic search:

```bash
npm install mikser-io-sdk-vector
```

The hit shape is generic on the embedded payload:

```ts
type ProductHit = { title: string; sku: string; price: number }
const search = useSimilar<ProductHit>('products', () => query)
//        ↑ search.results[0].data is typed ProductHit
```

## TypeScript

The reactives are generic on the entity type:

```ts
import type { MetaByLayout } from '$lib/mikser-content/entities'   // emitted by mikser-io-schemas

type Article = { id: string; meta: MetaByLayout<'article'> }

const article = useDocument<Article>(() => entityId)
// article.document.meta.title  ← typed
```

`mikser-io-sdk-api` provides the `EntitiesClient`, `Filter`, and `ListQuery` types. Pair with [`mikser-io-schemas`](https://github.com/almero-digital-marketing/mikser-io-schemas) for entity meta types generated from Zod schemas in the mikser project.

## Design notes

A few Svelte-specific choices worth knowing:

- **`setMikserClient(client)` is a function call, not a wrapper component.** Svelte's context API is set from a parent component's `<script>`, so the client is provided imperatively. Call it once near the root (typically the root `+layout.svelte`).
- **Getter form for re-subscription.** `useDocument(() => id)` re-subscribes when the rune `id` changes; passing a bare value captures a snapshot. The same applies to `useDocuments(() => query)` and to `useHref`/`useAlternates` inputs.
- **Returned objects expose getters.** `useDocument` returns `{ document, loading, error, refresh }` where `document`/`loading`/`error` are reactive getters. Read them directly in templates — don't destructure into local `const`s if you need ongoing reactivity (destructuring a getter copies the current value).
- **No programmatic router.** SvelteKit owns routing. `generateMikserRoutes` feeds the `entries()` prerender hook; `useMikserPages` feeds live content discovery; a catch-all `+page.svelte` does the actual rendering.

## Examples

Full runnable examples live in [`examples/`](./examples):

| Example | Shows |
|---|---|
| [`mikser-content/`](./examples/mikser-content) | The shared mikser server that feeds the apps. Run it first. |
| [`pure-spa/`](./examples/pure-spa) | Runtime-everything SPA — live navigation, `useDocuments`, live updates. |
| [`hybrid-ssg/`](./examples/hybrid-ssg) | SvelteKit static build (`generateMikserRoutes` + prerender) + a live editor from one catalog. |
| [`islands/`](./examples/islands) | mikser owns the HTML; Svelte mounts into specific DOM nodes. |

See [`examples/README.md`](./examples/README.md) for the run order.

## License

MIT
