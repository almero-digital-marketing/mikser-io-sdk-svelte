// Document data — useDocument (single) and useDocuments (list).
// Both wrap client.live() in $state.raw with subscription teardown
// inside $effect. Returns an object whose getters expose the reactive
// state — callers read `result.document` inside their templates and
// Svelte's reactivity tracks it.
//
// .svelte.js extension is required for $state / $effect to compile.
//
// Calling convention: pass a getter (`() => id`) so the effect can
// re-subscribe when the upstream state changes. Plain values also work
// — they just don't re-subscribe.
import { useMikserClient } from './client.js'

/**
 * Live single-document reactive. Resolves the doc by id and stays in
 * sync with changes via client.live().
 *
 *   <script>
 *     import { useDocument } from 'mikser-io-sdk-svelte'
 *     let { entityId } = $props()
 *     const article = useDocument(() => entityId)
 *   </script>
 *
 *   {#if article.loading}…{:else}<h1>{article.document?.meta.title}</h1>{/if}
 *
 * `getId` can be a string or a getter `() => string`. The effect tracks
 * runes referenced inside the getter, so the subscription re-establishes
 * automatically when the upstream id changes.
 */
export function useDocument(getId, { client: clientArg } = {}) {
    const client = clientArg ?? useMikserClient()

    let doc      = $state.raw(null)
    let loading  = $state(true)
    let error    = $state.raw(null)

    let refreshTick = $state(0)

    $effect(() => {
        // Touch refreshTick so refresh() forces re-subscription
        // eslint-disable-next-line no-unused-expressions
        refreshTick

        const id = typeof getId === 'function' ? getId() : getId
        if (id == null || id === '') {
            doc = null
            error = null
            loading = false
            return
        }

        loading = true
        error = null

        const dispose = client.live(
            { id },
            (items) => {
                doc = items[0] ?? null
                loading = false
            },
            {
                limit: 1,
                onError: (err) => {
                    error = err
                    loading = false
                },
            },
        )

        return () => dispose?.()
    })

    return {
        get document() { return doc },
        get loading()  { return loading },
        get error()    { return error },
        refresh() { refreshTick++ },
    }
}

/**
 * Live list reactive. Returns reactive `documents` that stays in sync
 * with client.live() updates.
 *
 *   <script>
 *     import { useDocuments } from 'mikser-io-sdk-svelte'
 *     const list = useDocuments(() => ({
 *         filter: { type: 'document', 'meta.published': true },
 *         sort:   { 'meta.date': -1 },
 *         limit:  20,
 *     }))
 *   </script>
 *
 *   {#each list.documents as doc (doc.id)}…{/each}
 *
 * `getQuery` can be a query object or a getter `() => ListQuery`.
 */
export function useDocuments(getQuery = () => ({}), { client: clientArg } = {}) {
    const client = clientArg ?? useMikserClient()

    let documents = $state.raw([])
    let loading   = $state(true)
    let error     = $state.raw(null)

    let refreshTick = $state(0)

    $effect(() => {
        // eslint-disable-next-line no-unused-expressions
        refreshTick

        const query = typeof getQuery === 'function' ? getQuery() : getQuery
        const { filter = {}, sort, fields, limit, skip } = query ?? {}

        loading = true
        error = null

        const dispose = client.live(
            filter,
            (items) => {
                documents = items
                loading = false
            },
            {
                sort, fields, limit, skip,
                onError: (err) => {
                    error = err
                    loading = false
                },
            },
        )

        return () => dispose?.()
    })

    return {
        get documents() { return documents },
        get loading()   { return loading },
        get error()     { return error },
        refresh() { refreshTick++ },
    }
}
