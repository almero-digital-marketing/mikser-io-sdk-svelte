// Reactive local content cache — Svelte 5 shell around sdk-api's
// createCache. A sync read() / documentSync() re-evaluates when an entry
// lands, so it works in $derived, stores, sync helpers — anywhere outside a
// component, because it's a plain factory, not a rune-bound composable.
// Create it once and share it.
//
// Pairs with the live href index (useHref / meta): meta() is always-fresh
// from an SSE subscription; this is load-once, expand-capable, readable from
// non-component code. live()/meta() for changing feeds; this for system
// docs, nav, settings — read often, change rarely.
//
//   const content = createReactiveCache(client.entities('public'))
//   await content.document('/system/products', { expand: ['products.*.video'] })
//   content.documentSync('/system/translation')   // sync + reactive
import { createCache } from 'mikser-io-sdk-api'

export function createReactiveCache(docs) {
    const cache = createCache(docs)
    // A version tick bumped on every cache change. Reading it inside a
    // $derived / effect registers the dependency, so a sync read re-runs
    // when its entry lands.
    let tick = $state(0)
    cache.subscribe(() => { tick++ })

    function load(query, opts)  { return cache.get(query, opts) }
    function read(query)        { tick; return cache.peek(query) }
    function invalidate(query)  { cache.invalidate(query) }

    // A document comes with its references resolved — default expand is the
    // `$` wildcard. Pass `expand: []` to opt out, or a path list to narrow.
    const byHref = (href, expand) => ({ filter: { 'meta.href': href }, limit: 1, expand })
    function document(href, { expand = ['$'] } = {}) {
        return cache.get(byHref(href, expand)).then(env => env.items?.[0] ?? null)
    }
    function documentSync(href, { expand = ['$'] } = {}) {
        tick
        return cache.peek(byHref(href, expand))?.items?.[0] ?? null
    }

    return { load, read, invalidate, document, documentSync, cache }
}
