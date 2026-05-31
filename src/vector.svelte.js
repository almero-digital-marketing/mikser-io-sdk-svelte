// Vector integration — bridges the mikser-io-sdk-vector client into a
// Svelte 5 runes-based primitive. Separate context slot from the
// documents client so projects without semantic search don't have to
// install mikser-io-sdk-vector.
//
// .svelte.js extension required for $state / $effect runes.
import { setContext, getContext } from 'svelte'

const MIKSER_VECTOR_CLIENT = Symbol('mikser-io.vector-client')

/**
 * setMikserVectorClient — call from a top-level component (typically
 * the root layout's <script>) to expose the vector client to
 * descendants.
 *
 *   <script>
 *     import { setMikserVectorClient } from 'mikser-io-sdk-svelte'
 *     import { createClient as createVectorClient } from 'mikser-io-sdk-vector'
 *     const similar = createVectorClient({ baseUrl: PUBLIC_MIKSER_URL })
 *     setMikserVectorClient(similar)
 *   </script>
 *
 * `client` should be what `createClient(...)` from mikser-io-sdk-vector
 * returns. This SDK doesn't import that package directly (optional
 * runtime dep), just expects the same surface.
 */
export function setMikserVectorClient(client) {
    if (!client) {
        throw new Error('setMikserVectorClient: client is required')
    }
    setContext(MIKSER_VECTOR_CLIENT, client)
    return client
}

/**
 * Read the configured vector client from context. useSimilar reads it
 * for you; this is for ad-hoc calls.
 */
export function useMikserVectorClient() {
    const client = getContext(MIKSER_VECTOR_CLIENT)
    if (!client) {
        throw new Error(
            'useMikserVectorClient: no vector client found. Did you call ' +
            'setMikserVectorClient(client) in a parent component?'
        )
    }
    return client
}

/**
 * Live semantic search reactive. Re-fires the search whenever the
 * upstream `getQuery` value changes, debounced. Stale responses are
 * discarded via a monotonic token, so a fast-typing burst can't have
 * older results clobber newer ones.
 *
 *   <script>
 *     import { useSimilar } from 'mikser-io-sdk-svelte'
 *     let query = $state('')
 *     const search = useSimilar('documents', () => query, {
 *         limit: 10, debounce: 200, minLength: 2,
 *     })
 *   </script>
 *
 *   <input bind:value={query} placeholder="Search…" />
 *   {#if search.loading}<p>Searching…</p>{/if}
 *   <ul>
 *     {#each search.results as hit (hit.id)}
 *       <li><a href={hit.id}>{hit.data?.title}</a></li>
 *     {/each}
 *   </ul>
 *
 * Configuration:
 *
 *   limit     — max hits per request. Default 5.
 *   debounce  — ms after the last query change before firing. Default
 *               200. Set to 0 to fire immediately.
 *   minLength — skip the request below this trimmed length. Default 1.
 *   client    — override the context client. Rare.
 *
 * `getQuery` is a getter (`() => query`) for re-firing on rune
 * changes, same convention as useDocument's first argument. A plain
 * string also works — it just doesn't react.
 */
export function useSimilar(storeName, getQuery, {
    client: clientArg,
    limit = 5,
    debounce = 200,
    minLength = 1,
} = {}) {
    const client = clientArg ?? useMikserVectorClient()
    const store = client.vector(storeName)

    let results = $state.raw([])
    let loading = $state(false)
    let error   = $state.raw(null)
    let refreshTick = $state(0)

    // Monotonic per-fire token. Held outside the $effect so it
    // survives across runs. Every new fire increments it; the response
    // handler discards itself when the token has moved on.
    let token = 0

    $effect(() => {
        // Read refreshTick so refresh() triggers a re-fire via the
        // effect's dependency tracking.
        void refreshTick

        const raw = typeof getQuery === 'function' ? getQuery() : getQuery
        const q = String(raw ?? '').trim()
        token++

        if (q.length < minLength) {
            results = []
            loading = false
            error = null
            return
        }

        const myToken = token

        async function fire() {
            loading = true
            try {
                const { results: hits } = await store.findSimilar(q, { limit })
                if (myToken !== token) return
                results = hits
                error = null
            } catch (err) {
                if (myToken !== token) return
                error = err
                results = []
            } finally {
                if (myToken === token) loading = false
            }
        }

        if (debounce > 0) {
            const timer = setTimeout(fire, debounce)
            return () => clearTimeout(timer)
        } else {
            fire()
            // No timer to clear, but mark in-flight as stale on cleanup
            return () => { token++ }
        }
    })

    return {
        get results() { return results },
        get loading() { return loading },
        get error()   { return error },
        refresh() { refreshTick++ },
    }
}
