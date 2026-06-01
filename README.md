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

**Typed at the seam.** Pair with [`mikser-io-plugin-schemas`](https://github.com/almero-digital-marketing/mikser-io-plugin-schemas) to author Zod schemas alongside your content; `useDocument<{ meta: MetaByLayout<'article'> }>(() => id)` then carries the front-matter shape straight into your templates.

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

## SvelteKit routing

SvelteKit owns routing via the filesystem, so the SDK doesn't ship a programmatic router. Two integration points cover the typical needs:

### Prerender every catalog route

```js
// src/routes/[...path]/+page.server.js
import { generateMikserRoutes } from 'mikser-io-sdk-svelte'
import { client } from '$lib/mikser'

export const prerender = true

export async function entries() {
    return generateMikserRoutes({
        client,
        mapRoute: document => ({ path: document.meta.route.replace(/^\//, '') }),
    })
}

export async function load({ params }) {
    // Resolve the entity for this path — use a list() with the
    // matching meta.route, or look it up by id directly.
}
```

### Live navigation, sitemaps, menus

For nav menus and sitemaps you want a **narrow** projection — the catalog can be large, and a `<nav>` only needs a handful of fields per entry. The right pattern is two clients off the same root:

- **`documents`** → the `public` endpoint, full content. Powers `useDocument` inside view components. Stays as the default via `setMikserClient`.
- **`sitemap`** → a fields-projected endpoint exposed by mikser's api plugin. Powers `useMikserPages`. Because the endpoint sets `cache: true`, the response is also written to disk so a reverse proxy can fail over to the cached file when mikser is unreachable.

```svelte
<script>
    import { createClient } from 'mikser-io-sdk-api'
    import { setMikserClient, useMikserPages } from 'mikser-io-sdk-svelte'

    const root = createClient({ baseUrl: PUBLIC_MIKSER_URL })
    const documents = root.entities('public')
    const sitemap   = root.entities('sitemap')
    setMikserClient(documents)            // default for useDocument et al.

    const pages = useMikserPages({
        client: sitemap,                  // narrow, cached, fail-safe
        mapPage: document => ({
            id:    document.id,
            path:  document.meta.route,
            title: document.meta.title,
            order: document.meta.nav_order ?? Infinity,
        }),
    })
</script>

<nav>
    {#each pages.items.sort((a, b) => a.order - b.order) as page (page.id)}
        <a href={page.path}>{page.title}</a>
    {/each}
</nav>
```

For the page-component dispatch, use a single catch-all SvelteKit route (`[...path]/+page.svelte`) that calls `useDocument` to resolve the entity for the current URL. Per-component views branch on `document.meta.component` — `layout` stays reserved for mikser's SSG render pipeline so the two never collide.

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
import type { MetaByLayout } from '$lib/mikser-content/entities'   // emitted by mikser-io-plugin-schemas

type Article = { id: string; meta: MetaByLayout<'article'> }

const article = useDocument<Article>(() => entityId)
// article.document.meta.title  ← typed
```

`mikser-io-sdk-api` provides the `EntitiesClient`, `Filter`, and `ListQuery` types. Pair with [`mikser-io-plugin-schemas`](https://github.com/almero-digital-marketing/mikser-io-plugin-schemas) for entity meta types generated from Zod schemas in the mikser project.

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
