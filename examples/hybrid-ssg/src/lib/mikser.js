// The shared entities client. Read by both the prerender-time
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

export const client = createClient({ url }).entities('public')
