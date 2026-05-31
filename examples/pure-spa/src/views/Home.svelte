<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    const featured = useDocuments(() => ({
        filter: { 'meta.featured': true },
        sort: { 'meta.date': -1 },
        limit: 6,
    }))
</script>

<section class="home">
    <h1>Welcome</h1>
    <p class="home__lead">
        This is a runtime-everything SPA powered by mikser. Routes and content
        are resolved live in the browser.
    </p>
    <h2>Featured</h2>
    <ul class="card-grid">
        {#each featured.documents as document (document.id)}
            {@const { meta } = document}
            <li class="card">
                <a href={document.route}>
                    <h3>{meta?.title ?? document.route}</h3>
                    {#if meta?.summary}<p>{meta.summary}</p>{/if}
                </a>
            </li>
        {/each}
    </ul>
</section>
