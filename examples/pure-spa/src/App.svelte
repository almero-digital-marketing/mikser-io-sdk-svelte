<script>
    import { createClient } from 'mikser-io-sdk-api'
    import { setMikserClient, useMikserPages } from 'mikser-io-sdk-svelte'
    import Nav from './components/Nav.svelte'
    import Home from './views/Home.svelte'
    import ArticleIndex from './views/ArticleIndex.svelte'
    import ProductIndex from './views/ProductIndex.svelte'
    import NotFound from './views/NotFound.svelte'
    import { viewForLayout } from './route-mapping.js'
    import { router } from './router.svelte.js'

    // 1. Create the entities client and expose it via Svelte context.
    const MIKSER_URL = import.meta.env.VITE_MIKSER_URL || 'http://localhost:3001'
    const client = createClient({ url: MIKSER_URL }).entities('public')
    setMikserClient(client)

    // 2. Static routes — pages that aren't backed by a catalog document.
    const staticRoutes = {
        '/': Home,
        '/articles': ArticleIndex,
        '/products': ProductIndex,
    }

    // 3. Live array of catalog routes, kept in sync via SSE.
    const pages = useMikserPages({
        mapPage: document => ({
            path: document.route,
            id: document.id,
            meta: document.meta,
            layout: document.meta?.layout ?? 'page',
        }),
    })

    // 4. Resolve the current path. Static wins over dynamic.
    const match = $derived.by(() => {
        const path = router.path
        const Static = staticRoutes[path]
        if (Static) return { View: Static, props: {} }

        const hit = pages.items.find(p => p.path === path)
        if (hit) {
            return {
                View: viewForLayout[hit.layout] ?? viewForLayout.page,
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
