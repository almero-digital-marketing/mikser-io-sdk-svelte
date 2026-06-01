<script>
    import { useDocumentByRoute } from 'mikser-io-sdk-svelte'
    import { router } from '../router.svelte.js'
    import ArticleView from './ArticleView.svelte'
    import ProductView from './ProductView.svelte'
    import LandingView from './LandingView.svelte'
    import PageView    from './PageView.svelte'
    import NotFound    from './NotFound.svelte'

    // Look up the catalog entry whose meta.route matches the current URL.
    // With cache: true on the public endpoint, mikser writes each unique
    // route's response to disk as a side effect — repeat visits to the
    // same route are served by the reverse proxy directly. First visit
    // pays one API roundtrip; warm thereafter. Effectively per-route ISR.
    const result = useDocumentByRoute(() => router.path)

    // Same dispatch table as pure-spa's route-mapping.js, keyed inline.
    const viewForComponent = {
        article: ArticleView,
        product: ProductView,
        landing: LandingView,
        page:    PageView,    // fallback for unknown components
    }
</script>

{#if result.loading}
    <p class="loading">Loading…</p>
{:else if result.document}
    {@const View = viewForComponent[result.document.meta?.component] ?? PageView}
    <View id={result.document.id} meta={result.document.meta} />
{:else}
    <NotFound />
{/if}

<style>
    .loading { padding: 2rem; color: #888; text-align: center; }
</style>
