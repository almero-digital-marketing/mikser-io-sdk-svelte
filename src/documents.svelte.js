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
import { setContext, getContext } from 'svelte'
import { useMikserClient } from './client.js'

const CURRENT_DOCUMENT = Symbol('mikser-io.current-document')

// Normalize a route source to a path string. Same logic across the
// vue/react/svelte SDKs: a string, a getter, or the route object your
// router hands you — a SvelteKit page (`.url.pathname`), a vue-router
// route (`.path`), or a react-router location (`.pathname`). The SDK
// reads a field; it never imports a router, so `route: () => page`
// works as well as `route: () => page.url.pathname`.
function toRoutePath(route) {
    if (route == null) return null
    if (typeof route === 'function') return toRoutePath(route())
    if (typeof route === 'string') return route
    if (route.url && typeof route.url.pathname === 'string') return route.url.pathname
    if (typeof route.path === 'string') return route.path
    if (typeof route.pathname === 'string') return route.pathname
    return null
}

/**
 * Live single-document reactive. Resolves the document by id and stays in
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
export function useDocument(getId, { client: clientArg, expand, fields } = {}) {
    const client = clientArg ?? useMikserClient()

    let document      = $state.raw(null)
    let loading  = $state(true)
    let error    = $state.raw(null)

    let refreshTick = $state(0)

    $effect(() => {
        // Read refreshTick so refresh() forces re-subscription via the
        // effect's dependency tracking.
        void refreshTick

        const id = typeof getId === 'function' ? getId() : getId
        if (id == null || id === '') {
            document = null
            error = null
            loading = false
            return
        }

        loading = true
        error = null

        const dispose = client.live(
            { id },
            (items) => {
                document = items[0] ?? null
                loading = false
            },
            {
                limit: 1,
                fields,
                expand,                  // see ADR-0007 — inline-resolve $-refs
                onError: (err) => {
                    error = err
                    loading = false
                },
            },
        )

        return () => dispose?.()
    })

    return {
        get document() { return document },
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
 *   {#each list.documents as document (document.id)}…{/each}
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
        // Read refreshTick so refresh() forces re-subscription via the
        // effect's dependency tracking.
        void refreshTick

        const query = typeof getQuery === 'function' ? getQuery() : getQuery
        const { filter = {}, sort, fields, limit, skip, expand } = query ?? {}

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
                expand,                  // see ADR-0007 — inline-resolve $-refs
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

/**
 * Live single-document lookup by URL route. Resolves the document
 * whose `meta.route` matches the given path; stays subscribed for
 * updates. Use this in the catch-all view of a SPA with dynamic
 * routes — the right shape when the catalog is too large to enumerate
 * via the snapshot/registered-routes approach.
 *
 * Each unique route resolves through the api plugin's per-query cache,
 * so the first user pays an API round-trip and subsequent users get
 * the cached file via the reverse proxy — effectively on-demand SSG
 * with no extra config.
 *
 *   <script>
 *     import { page } from '$app/state'
 *     import { useDocumentByRoute } from 'mikser-io-sdk-svelte'
 *     const result = useDocumentByRoute(() => page.url.pathname)
 *   </script>
 *
 *   {#if result.loading}…{:else if result.document}<Page {...result.document} />{/if}
 *
 * Extra options:
 *   - `extraFilter`: merged into the filter (default `{ 'meta.published': true }`).
 *     Pass `{}` to disable the published filter; pass other fields to add them.
 *   - `client`: override the default entities client.
 */
export function useDocumentByRoute(getPath, {
    client: clientArg,
    extraFilter = { 'meta.published': true },
} = {}) {
    const client = clientArg ?? useMikserClient()

    let document = $state.raw(null)
    let loading  = $state(true)
    let error    = $state.raw(null)

    let refreshTick = $state(0)

    $effect(() => {
        void refreshTick

        const path = typeof getPath === 'function' ? getPath() : getPath
        if (path == null || path === '') {
            document = null
            error = null
            loading = false
            return
        }

        loading = true
        error = null

        const filter = { 'meta.route': path, ...(extraFilter ?? {}) }
        const dispose = client.live(
            filter,
            (items) => {
                document = items[0] ?? null
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
        get document() { return document },
        get loading()  { return loading },
        get error()    { return error },
        refresh() { refreshTick++ },
    }
}

/**
 * provideCurrentDocument — subscribe ONCE to the current-route document
 * from a top-level component and share it with descendants via
 * useCurrentDocument(). The third member of the provide-once family
 * alongside provideHrefIndex / provideAssetIndex — for the singular
 * ambient "current page" document a content SPA reads everywhere.
 * Without it, each useDocumentByRoute() call opens its own identical
 * subscription to the same document.
 *
 *   <script>
 *     import { page } from '$app/state'
 *     import { provideCurrentDocument } from 'mikser-io-sdk-svelte'
 *     provideCurrentDocument({ route: () => page.url.pathname })
 *   </script>
 *
 *   // descendant
 *   const current = useCurrentDocument()
 *   {#if current.document}<h1>{current.document.meta.title}</h1>{/if}
 *
 * `route` is the current-route source — pass a getter to SvelteKit's
 * page (`route: () => page`, the SDK reads `.url.pathname`) or to the
 * path directly (`route: () => page.url.pathname`). The SDK stays
 * router-agnostic; it reads a field, never imports one. `resolve` maps
 * a path to the lookup filter (default `meta.route === path`).
 * `extraFilter` is merged in (default none — pass
 * `{ 'meta.published': true }` to require published).
 */
export function provideCurrentDocument({
    route,
    client: clientArg,
    resolve = (path) => ({ 'meta.route': path }),
    extraFilter = {},
    fields,
    // A document comes with its references resolved: the default expand is the
    // `$` wildcard (resolve every ref, ADR-0007). Pass `expand: []` to opt out,
    // or a path list to narrow it.
    expand = ['$'],
} = {}) {
    if (route == null) {
        throw new Error('provideCurrentDocument: { route } is required (a path string or getter)')
    }
    const client = clientArg ?? useMikserClient()

    let document = $state.raw(null)
    let loading  = $state(true)

    $effect(() => {
        const path = toRoutePath(route)
        if (path == null || path === '') {
            document = null
            loading = false
            return
        }
        loading = true
        const filter = { ...resolve(path), ...extraFilter }
        const dispose = client.live(
            filter,
            (items) => {
                document = items[0] ?? null
                loading = false
            },
            { limit: 1, fields, expand, onError: () => { loading = false } },
        )
        return () => dispose?.()
    })

    const slot = {
        get document() { return document },
        get loading()  { return loading },
    }
    setContext(CURRENT_DOCUMENT, slot)
    return slot
}

/**
 * Read the shared current-route document. Returns an object with
 * reactive `document` / `loading` getters. Requires
 * provideCurrentDocument() in a parent.
 */
export function useCurrentDocument() {
    const slot = getContext(CURRENT_DOCUMENT)
    if (!slot) {
        throw new Error(
            'useCurrentDocument: provideCurrentDocument() must be called in a parent component first'
        )
    }
    return slot
}
