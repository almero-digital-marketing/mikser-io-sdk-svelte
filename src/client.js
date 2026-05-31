// Client context — the entities client is shared via Svelte's
// setContext / getContext. Every other module in this SDK either
// takes a client explicitly or reads it via useMikserClient().
//
// This file is plain .js (no runes) — context APIs aren't reactive,
// they're just typed slots in the component tree.
import { setContext, getContext } from 'svelte'

export const MIKSER_CLIENT = Symbol('mikser-io.client')

/**
 * setMikserClient — call from a top-level component (or the SvelteKit
 * root layout's <script>) to expose the entities client to descendants.
 *
 *   <script>
 *     import { setMikserClient } from 'mikser-io-sdk-svelte'
 *     import { createClient } from 'mikser-io-sdk-api'
 *     const documents = createClient({ url: PUBLIC_MIKSER_URL }).entities('public')
 *     setMikserClient(documents)
 *   </script>
 */
export function setMikserClient(client) {
    if (!client) {
        throw new Error('setMikserClient: client is required')
    }
    setContext(MIKSER_CLIENT, client)
    return client
}

/**
 * Read the configured entities client. Usually you don't need this —
 * useDocument / useDocuments etc. read it for you. Useful for ad-hoc
 * calls (urlFor, render, etc.).
 */
export function useMikserClient() {
    const client = getContext(MIKSER_CLIENT)
    if (!client) {
        throw new Error(
            'useMikserClient: no client found. Did you call setMikserClient(client) ' +
            'in a parent component?'
        )
    }
    return client
}
