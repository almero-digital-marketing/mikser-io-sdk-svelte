// Catch-all dynamic route. SvelteKit calls entries() at build time to
// know which paths to prerender, then calls load() for each — both run
// against the mikser catalog.
import { generateMikserRoutes } from 'mikser-io-sdk-svelte'
import { documents } from '$lib/mikser.js'
import { routeFor } from '$lib/route-mapping.js'

export const prerender = true

// Enumerate every published document with a meta.component.
// generateMikserRoutes calls listAll(), which consults the
// initialUrl snapshot ($lib/mikser.js → /data/sitemap.json) before
// falling back to a fresh list().
export async function entries() {
    const routes = await generateMikserRoutes({
        client: documents,
        mapRoute: document => {
            const path = routeFor(document)
            return path ? { path: path.replace(/^\//, '') } : null
        },
    })
    // The homepage is handled by src/routes/+page.svelte — drop the
    // empty path so we don't collide.
    return routes.filter(r => r && r.path !== '')
}

// Fetch the document for the matched path. params.path is the URL
// path with the leading '/' stripped; convert back when querying.
// Uses documents (full content) so the prerendered HTML bakes in
// the body.
export async function load({ params }) {
    const target = '/' + params.path
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
