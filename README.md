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

    const docs = createClient({ url: PUBLIC_MIKSER_URL }).entities('public')
    setMikserClient(docs)
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
| `provideHrefIndex(options?)` + `useHref(lang?)` | Multilingual href abstraction — same pattern as `sdk-vue` / `sdk-react`. |
| `useAlternates({ route, languages? })` | Alternates for hreflang tags and language switchers. |
| `provideAssetIndex(options?)` + `useAsset()` | Resolve asset references to URL + dimensions + srcset. |

## Reactivity model — read this first

The SDK uses Svelte 5 runes (`$state`, `$effect`, `$derived`) internally. From the outside the API looks like plain functions that return objects, but those objects' properties are reactive — Svelte tracks their reads inside templates and `$effect` blocks.

**Reading state inside a template:** just use the dot-access — Svelte tracks it.

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

The getter form lets the SDK's internal `$effect` track whatever rune state you read inside it. This is the same pattern as Vue's `() => props.entityId` getter shape.

## SvelteKit routing

SvelteKit owns routing via the filesystem, so the SDK doesn't ship a `createMikserRouter` equivalent. Two integration points cover the typical needs:

### Prerender every catalog route

```js
// src/routes/[...path]/+page.server.js
import { generateMikserRoutes } from 'mikser-io-sdk-svelte'
import { client } from '$lib/mikser'

export const prerender = true

export async function entries() {
    return generateMikserRoutes({
        client,
        mapRoute: doc => ({ path: doc.meta.route.replace(/^\//, '') }),
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
        mapPage: doc => ({
            id:    doc.id,
            path:  doc.meta.route,
            title: doc.meta.title,
            order: doc.meta.nav_order ?? Infinity,
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

Same front-matter convention as Vue / React SDKs (`meta.href` = logical reference, `meta.lang` = which language, `meta.route` = deployed URL).

```svelte
<!-- src/routes/+layout.svelte -->
<script>
    import { provideHrefIndex } from 'mikser-io-sdk-svelte'
    import { locale } from '$lib/i18n'
    provideHrefIndex({ defaultLang: 'en' })
</script>
```

```svelte
<!-- Anywhere below -->
<script>
    import { useHref, useAlternates } from 'mikser-io-sdk-svelte'
    import { locale } from '$lib/i18n'
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

<!-- hreflang (omit languages for "only real translations") -->
<svelte:head>
    {#each useAlternates({ route: () => page.url.pathname }).alternates as { lang, url } (lang)}
        <link rel="alternate" hreflang={lang} href={url} />
    {/each}
</svelte:head>
```

## Asset resolution

```svelte
<script>
    import { useAsset } from 'mikser-io-sdk-svelte'
    const { image } = useAsset()
</script>

{#if image('/assets/hero.jpg')}
    <img {...image('/assets/hero.jpg')} />
{/if}
```

`image()` returns `{ src, width, height, srcset, alt }` — Svelte uses lowercase HTML attribute names, so `srcset` not `srcSet`.

## TypeScript

The reactives are generic on the entity type:

```ts
import type { MetaByLayout } from '$lib/mikser-content/entities'   // emitted by mikser-io-schemas

type Article = { id: string; meta: MetaByLayout<'article'> }

const article = useDocument<Article>(() => entityId)
// article.document.meta.title  ← typed
```

`mikser-io-sdk-api` provides the `EntitiesClient`, `Filter`, and `ListQuery` types. Pair with [`mikser-io-schemas`](https://github.com/almero-digital-marketing/mikser-io-schemas) for entity meta types generated from Zod schemas in the mikser project.

## Differences from the Vue and React SDKs

The shape is intentionally parallel, with three Svelte-idiomatic deltas:

1. **`setMikserClient(client)` replaces `<MikserProvider>` / `createMikserPlugin`** — Svelte's context API is a function call from a parent component, not a wrapper component.
2. **Getter form for re-subscription** — `useDocument(() => id)` re-subscribes when the rune `id` changes; passing the value directly captures a snapshot and doesn't re-subscribe. The Vue SDK's `() => props.x` shape is identical; the React SDK uses dep arrays instead.
3. **SvelteKit-friendly routing** — no `createMikserRouter` because SvelteKit owns routing. The SDK provides `generateMikserRoutes` for prerender hooks and `useMikserPages` for live content discovery; you wire up a catch-all `+page.svelte` for the actual rendering.

Everything else — return shapes, options, fallback behaviour — mirrors the Vue and React SDKs exactly.

## License

MIT
