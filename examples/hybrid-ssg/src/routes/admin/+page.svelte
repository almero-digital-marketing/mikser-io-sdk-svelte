<script>
    import { setMikserClient, useDocuments, useDocument } from 'mikser-io-sdk-svelte'
    import { documents } from '$lib/mikser.js'
    import { viewForComponent, routeFor } from '$lib/route-mapping.js'

    // One client. data.catalog in $lib/mikser.js points it at the static
    // data-plugin snapshot, so the list below fills from disk on first
    // paint without an API roundtrip; live SSE keeps it current.
    setMikserClient(documents)

    let selectedId = $state(null)

    const all = useDocuments(() => ({
        filter: { 'meta.published': true, 'meta.component': { $exists: true } },
        sort:   { 'meta.route': 1 },
        fields: ['id', 'destination', 'meta'],
    }))

    // Full document fetch — uses the documents client from context.
    const selected = useDocument(() => selectedId)

    const View = $derived(
        viewForComponent[selected.document?.meta?.component] ?? viewForComponent.page,
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
                        {document.meta?.title ?? routeFor(document)}
                        <small>{document.meta?.component}</small>
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
