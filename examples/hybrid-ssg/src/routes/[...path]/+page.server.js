// Catch-all dynamic route. SvelteKit calls entries() at build time to
// know which paths to prerender, then calls load() for each — both run
// against the mikser catalog.
import { generateMikserRoutes } from 'mikser-io-sdk-svelte'
import { client } from '$lib/mikser.js'

export const prerender = true

// Enumerate every published document with a meta.route. SvelteKit will then
// invoke load() with params.path = document.route minus the leading slash.
export async function entries() {
    const routes = await generateMikserRoutes({
        client,
        filter: { 'meta.published': true, 'meta.route': { $exists: true } },
        mapRoute: document => ({ path: document.meta.route.replace(/^\//, '') }),
    })
    // The homepage is handled by src/routes/+page.svelte — drop the
    // empty path so we don't collide.
    return routes.filter(r => r.path !== '')
}

// Fetch the document for the matched path. params.path is the URL path
// with the leading '/' stripped; convert back when querying.
export async function load({ params }) {
    const target = '/' + params.path
    const { items } = await client.list({
        filter: { 'meta.route': target, 'meta.published': true },
        limit: 1,
    })
    return { document: items[0] || null }
}
