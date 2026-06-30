// Routing helpers.
//
// SvelteKit owns routing via the filesystem, so this module doesn't
// ship a programmatic router. Instead it exposes two helpers that fit
// the SvelteKit way of working:
//
//   - generateMikserRoutes — async one-shot enumerator. Use from a
//     SvelteKit `entries()` hook (in +page.server.js) for prerendering
//     dynamic content paths.
//
//   - useMikserPages — live reactive array of {path, id, meta} entries
//     for content-driven navigation (sitemaps, menus, search). Used
//     inside .svelte components.
//
// The actual routing decisions stay with SvelteKit. mikser supplies the
// "which routes exist" data; the consumer wires up +page.svelte files
// (typically a single `[...path]/+page.svelte` that uses useDocument
// to resolve the entity for the current URL).
//
// No watchUnmatchedRoutes here (the vue/react SDKs ship it): SvelteKit owns
// route matching and surfaces its own 404 via +error.svelte, so there's no
// route-table / no-match hook to attach to. The mikser-relevant "unmatched"
// case — a URL with no catalog document — is already visible as a null
// useDocument() in the catch-all `[...path]/+page.svelte`, so a detector
// would duplicate a signal the consumer already has. Adding one would be a
// contrived port of a vue/react mechanism that doesn't fit this model.
import { useMikserClient } from './client.js'

const DEFAULT_FILTER = { 'meta.published': true, 'meta.route': { $exists: true } }

/**
 * Build-time route enumeration. Lists every matching catalog entity
 * and applies the mapRoute callback.
 *
 *   // src/routes/[...path]/+page.server.js
 *   import { generateMikserRoutes } from 'mikser-io-sdk-svelte'
 *   import { client } from '$lib/mikser'
 *
 *   export const prerender = true
 *
 *   export async function entries() {
 *       const routes = await generateMikserRoutes({
 *           client,
 *           mapRoute: document => ({ path: document.meta.route.replace(/^\//, '') }),
 *       })
 *       return routes
 *   }
 *
 * The mapRoute return shape is whatever the caller's `entries()` hook
 * expects — this helper just enumerates the catalog and applies the
 * mapper.
 *
 * Auto-paginates via sdk-api's listAll() — no manual limit, no silent
 * truncation on large catalogs.
 */
// Implementation lives in mikser-io-sdk-api so all three framework SDKs
// share the same enumeration + filter defaults. Re-export here so
// Svelte users still import it from their framework package.
export { generateMikserRoutes } from 'mikser-io-sdk-api'

/**
 * Live reactive array of page entries from the catalog.
 *
 *   <script>
 *     import { useMikserPages } from 'mikser-io-sdk-svelte'
 *     const pages = useMikserPages({
 *         mapPage: document => ({ id: document.id, path: document.meta.route, title: document.meta.title }),
 *     })
 *   </script>
 *
 *   {#each pages.items as page (page.id)}
 *     <a href={page.path}>{page.title}</a>
 *   {/each}
 *
 * Use for content-driven menus, sitemaps, search indexes. For the
 * actual route → component dispatch, use a single SvelteKit catch-all
 * route (e.g. `[...path]/+page.svelte`) with `useDocument` inside.
 */
export function useMikserPages({
    client: clientArg,
    filter = DEFAULT_FILTER,
    mapPage,
} = {}) {
    if (!mapPage) {
        throw new Error('useMikserPages: { mapPage } is required')
    }
    const client = clientArg ?? useMikserClient()

    let items = $state.raw([])
    let loading = $state(true)
    let error   = $state.raw(null)

    $effect(() => {
        loading = true
        error = null

        const dispose = client.live(
            filter,
            (documents) => {
                items = documents.map(mapPage).filter(Boolean)
                loading = false
            },
            {
                fields: ['id', 'meta'],
                onError: (err) => {
                    error = err
                    loading = false
                },
            },
        )

        return () => dispose?.()
    })

    return {
        get items()   { return items },
        get loading() { return loading },
        get error()   { return error },
    }
}
