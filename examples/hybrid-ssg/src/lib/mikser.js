// Shared entity client. Read by both the prerender-time
// +page.server.js files (Node) and the runtime /admin route (browser).
//
// MIKSER_URL (build) and PUBLIC_MIKSER_URL (browser) both default to
// the local mikser dev server.
import { createClient } from 'mikser-io-sdk-api'

const url = (
    typeof process !== 'undefined' && process.env?.MIKSER_URL
) || (
    typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_MIKSER_URL
) || 'http://localhost:3001'

// One client. data.catalog points at the static snapshot the data
// plugin writes (out/data/sitemap.json) — the SDK loads it on first
// paint and listAll() during prerender consults it before falling
// back to a fresh list() call. Live SSE keeps the runtime admin SPA
// current.
export const documents = createClient({ baseUrl: url })
    .entities('public', { data: { catalog: 'sitemap', entities: 'page' } })
