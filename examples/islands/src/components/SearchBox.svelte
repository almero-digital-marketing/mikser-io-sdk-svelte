<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    // The mount script passes the client in directly; we hand it to
    // useDocuments via options so no Svelte context wiring is needed
    // for islands (each is a separate independent mount).
    let { client } = $props()

    let query = $state('')

    const everything = useDocuments(
        () => ({
            fields: ['id', 'route', 'meta'],
            limit: 100,
        }),
        { client },
    )

    const results = $derived.by(() => {
        const term = query.trim().toLowerCase()
        if (!term) return []
        return everything.documents
            .filter(document => (document.meta?.title ?? '').toLowerCase().includes(term))
            .slice(0, 8)
    })
</script>

<div class="search">
    <input
        bind:value={query}
        type="search"
        placeholder="Search…"
        class="search__input"
    />
    {#if results.length}
        <ul class="search__results">
            {#each results as hit (hit.id)}
                <li><a href={hit.route}>{hit.meta?.title ?? hit.route}</a></li>
            {/each}
        </ul>
    {/if}
</div>
