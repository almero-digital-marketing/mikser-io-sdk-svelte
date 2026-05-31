# mikser-io-sdk-svelte

Svelte 5 (runes) and SvelteKit integration for a [mikser-io](https://github.com/almero-digital-marketing/mikser-io) server. Pairs with [`mikser-io-sdk-api`](https://github.com/almero-digital-marketing/mikser-io-sdk-api) — that package handles transport (HTTP + SSE); this one wraps it in Svelte idioms.

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

    const documents = createClient({ url: PUBLIC_MIKSER_URL }).entities('public')
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

```svelte
<script>
    import { useMikserPages } from 'mikser-io-sdk-svelte'

    const pages = useMikserPages({
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

For the page-component dispatch, use a single catch-all SvelteKit route (`[...path]/+page.svelte`) that calls `useDocument` to resolve the entity for the current URL. Per-layout components branch on `document.meta.layout`.

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
