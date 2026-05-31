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
import { useMikserClient } from './client.js'

const DEFAULT_FILTER = { 'meta.published': true, 'meta.route': { $exists: true } }

/**
 * Build-time route enumeration. One-shot client.list().
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
 */
export async function generateMikserRoutes({
    client,
    filter = DEFAULT_FILTER,
    mapRoute,
} = {}) {
    if (!client)   throw new Error('generateMikserRoutes: { client } is required')
    if (!mapRoute) throw new Error('generateMikserRoutes: { mapRoute } is required')

    const { items } = await client.list({
        filter,
        fields: ['id', 'meta'],
        limit:  10_000,
    })
    return items.map(mapRoute)
}

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
