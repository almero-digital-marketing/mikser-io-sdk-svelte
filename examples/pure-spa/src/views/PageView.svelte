<script>
    import { useDocument } from 'mikser-io-sdk-svelte'

    let { id } = $props()
    const page = useDocument(() => id)
</script>

{#if page.document}
    {@const { meta, content } = page.document}
    <article class="page">
        <h1>{meta?.title}</h1>
        <div class="page__body">{@html content}</div>
    </article>
{/if}
