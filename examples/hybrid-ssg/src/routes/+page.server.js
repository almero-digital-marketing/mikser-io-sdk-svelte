import { documents } from '$lib/mikser.js'

export const prerender = true

// Simple welcome page that lists every available locale + the index
// document for each. Built once at prerender time. Narrow fields
// projection keeps the response small even though we're hitting the
// full-content endpoint.
export async function load() {
    const { items } = await documents.list({
        filter: { 'meta.component': 'page', 'meta.nav': true },
        fields: ['id', 'route', 'meta'],
        sort: { 'meta.nav_order': 1 },
        limit: 1000,
    })
    return { navDocs: items }
}
