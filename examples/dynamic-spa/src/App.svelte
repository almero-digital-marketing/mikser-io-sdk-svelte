<script>
    import { createClient } from 'mikser-io-sdk-api'
    import { setMikserClient } from 'mikser-io-sdk-svelte'
    import Nav from './components/Nav.svelte'
    import Home from './views/Home.svelte'
    import DocumentResolver from './views/DocumentResolver.svelte'
    import { router } from './router.svelte.js'

    // Scenario D — Dynamic routes.
    //
    //   No data.catalog. No useMikserPages. No /data/sitemap.json snapshot.
    //
    // Why: when the catalog is past ~5–10k routes, loading every route
    // into a snapshot at boot is the wrong shape. The catch-all
    // DocumentResolver below resolves the current path against mikser
    // per-navigation. With cache: true on the public endpoint a reverse
    // proxy serves repeat visits from disk — effectively per-route ISR.
    const MIKSER_URL = import.meta.env.VITE_MIKSER_URL || 'http://localhost:3001'
    const documents = createClient({ baseUrl: MIKSER_URL })
        .entities('public')
    setMikserClient(documents)

    // Static routes — pages that aren't backed by a catalog document.
    // Anything not matched here falls through to DocumentResolver.
    const staticRoutes = {
        '/': Home,
    }

    // Resolve the current path. Static wins over dynamic.
    const match = $derived.by(() => {
        const Static = staticRoutes[router.path]
        if (Static) return { View: Static }
        return { View: DocumentResolver }    // catch-all
    })

    // Intercept in-app link clicks for pushState navigation. Letting
    // cmd/ctrl-click, target=_blank and external URLs through preserves
    // the platform behaviour users expect.
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
        {@const { View } = match}
        <View />
    </main>
</div>
