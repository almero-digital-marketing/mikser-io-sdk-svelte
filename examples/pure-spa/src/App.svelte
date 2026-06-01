<script>
    import { createClient } from 'mikser-io-sdk-api'
    import { setMikserClient, useMikserPages } from 'mikser-io-sdk-svelte'
    import Nav from './components/Nav.svelte'
    import Home from './views/Home.svelte'
    import ArticleIndex from './views/ArticleIndex.svelte'
    import ProductIndex from './views/ProductIndex.svelte'
    import NotFound from './views/NotFound.svelte'
    import { viewForComponent, routeFor } from './route-mapping.js'
    import { router } from './router.svelte.js'

    // 1. One client, one endpoint. data.catalog points at the static
    //    snapshot the data plugin writes (out/data/sitemap.json) —
    //    that's the fast first-paint path for routes. After the
    //    snapshot lands the SDK opens a live SSE subscribe on the same
    //    /public endpoint for incremental updates. No second API
    //    endpoint, no second cache file — just one CDN-cacheable
    //    static file plus the existing live channel.
    const MIKSER_URL = import.meta.env.VITE_MIKSER_URL || 'http://localhost:3001'
    const documents = createClient({ baseUrl: MIKSER_URL })
        .entities('public', { data: { catalog: 'sitemap' } })
    setMikserClient(documents)

    // 2. Static routes — pages that aren't backed by a catalog document.
    const staticRoutes = {
        '/': Home,
        '/articles': ArticleIndex,
        '/products': ProductIndex,
    }

    // 3. Live array of catalog routes. Reads the default client set
    //    above — initial fill from the snapshot, then SSE deltas.
    const pages = useMikserPages({
        mapPage: document => {
            const path = routeFor(document)
            if (!path) return null
            return {
                path,
                id: document.id,
                meta: document.meta,
                component: document.meta?.component ?? 'page',
            }
        },
    })

    // 4. Resolve the current path. Static wins over dynamic.
    const match = $derived.by(() => {
        const path = router.path
        const Static = staticRoutes[path]
        if (Static) return { View: Static, props: {} }

        const hit = pages.items.find(p => p && p.path === path)
        if (hit) {
            return {
                View: viewForComponent[hit.component] ?? viewForComponent.page,
                props: { id: hit.id, meta: hit.meta },
            }
        }
        return null
    })

    // 5. Intercept in-app link clicks for pushState navigation. Letting
    //    cmd/ctrl-click, target=_blank and external URLs through preserves
    //    the platform behaviour users expect.
    function interceptLinks(event) {
        if (event.defaultPrevented || event.button !== 0) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const a = event.target.closest('a[href]')
        if (!a || a.target === '_blank') return
        const url = new URL(a.href, location.origin)
        if (url.origin !== location.origin) return
        event.preventDefault()
        router.navigate(url.pathname)
    }
</script>

<div class="app" onclick={interceptLinks}>
    <Nav />
    <main class="content">
        {#if match}
            {@const { View, props } = match}
            <View {...props} />
        {:else}
            <NotFound />
        {/if}
    </main>
</div>
