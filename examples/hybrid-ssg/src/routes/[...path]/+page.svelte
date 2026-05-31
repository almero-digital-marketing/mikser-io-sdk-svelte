<script>
    import { viewForLayout } from '$lib/route-mapping.js'

    let { data } = $props()

    // Pick the right view by meta.layout, falling back to PageView.
    const View = $derived(
        viewForLayout[data.document?.meta?.layout] ?? viewForLayout.page,
    )
</script>

{#if data.document}
    <View document={data.document} />
{:else}
    <section class="not-found">
        <h1>404</h1>
        <p>This page does not exist.</p>
        <p><a href="/">Go home</a></p>
    </section>
{/if}
