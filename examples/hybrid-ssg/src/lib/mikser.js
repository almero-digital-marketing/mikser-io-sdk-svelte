// Shared entity clients. Read by both the prerender-time
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

const root = createClient({ baseUrl: url })

// Full document fetch — used by the catch-all's load() during
// prerender and by useDocument inside the admin SPA.
export const documents = root.entities('public')

// Narrow router data — used by entries() during prerender and by the
// admin SPA's list. Server-side `cache: true` means a reverse proxy
// can fall back to the cached file when mikser is down — transparent
// to the SDK.
export const sitemap = root.entities('sitemap')
