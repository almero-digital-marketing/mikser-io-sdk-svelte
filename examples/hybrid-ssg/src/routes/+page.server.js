import { client } from '$lib/mikser.js'

export const prerender = true

// Simple welcome page that lists every available locale + the index
// document for each. Built once at prerender time.
export async function load() {
    const { items } = await client.list({
        filter: { 'meta.layout': 'page', 'meta.nav': true },
        fields: ['id', 'route', 'meta'],
        sort: { 'meta.nav_order': 1 },
        limit: 1000,
    })
    return { navDocs: items }
}
