<script>
    import { setMikserClient, useDocuments, useDocument } from 'mikser-io-sdk-svelte'
    import { client } from '$lib/mikser.js'
    import { viewForLayout } from '$lib/route-mapping.js'

    // The live editor uses the same client, but at runtime (no
    // prerender). Subscriptions stay open via SSE.
    setMikserClient(client)

    let selectedId = $state(null)

    const all = useDocuments(() => ({
        filter: { 'meta.published': true, 'meta.route': { $exists: true } },
        sort: { 'meta.route': 1 },
        fields: ['id', 'route', 'meta'],
    }))

    const selected = useDocument(() => selectedId)

    const View = $derived(
        viewForLayout[selected.document?.meta?.layout] ?? viewForLayout.page,
    )
</script>

<div class="admin">
    <aside class="admin__list">
        <h2>Documents</h2>
        {#if all.loading}<p>Loading…</p>{/if}
        <ul>
            {#each all.documents as document (document.id)}
                <li class:selected={selectedId === document.id}>
                    <button onclick={() => (selectedId = document.id)}>
                        {document.meta?.title ?? document.route}
                        <small>{document.meta?.layout}</small>
                    </button>
                </li>
            {/each}
        </ul>
    </aside>

    <section class="admin__preview">
        {#if selected.document}
            <View document={selected.document} />
        {:else}
            <p>Pick a document on the left to preview it.</p>
            <p>
                The list and the preview both stay live via SSE — edit any
                <code>.md</code> file in mikser-content while this view is open and
                watch it update without a refresh.
            </p>
        {/if}
    </section>
</div>

<style>
    .admin { display: grid; grid-template-columns: 280px 1fr; gap: 1rem; }
    .admin__list ul { list-style: none; padding: 0; }
    .admin__list button { display: block; width: 100%; text-align: left; }
    .admin__list li.selected button { font-weight: bold; }
</style>
