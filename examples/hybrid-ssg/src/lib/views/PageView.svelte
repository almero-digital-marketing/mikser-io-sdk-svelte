<script>
    // The public side receives `document` already loaded (from
    // +page.server.js). The /admin route also uses this component but
    // passes a live `document` from useDocument(); both work because
    // we just read fields.
    let { document } = $props()
</script>

{#if document}
    {@const { meta, content } = document}
    <article class="page">
        <h1>{meta?.title}</h1>
        <div class="page__body">{@html content}</div>
    </article>
{/if}
