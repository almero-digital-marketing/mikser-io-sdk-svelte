<script>
    import { useDocument } from 'mikser-io-sdk-svelte'

    let { id } = $props()

    const article = useDocument(() => id)
</script>

{#if article.loading}
    <p>Loading…</p>
{:else if article.document}
    {@const { meta, content } = article.document}
    <article class="article">
        <header class="article__header">
            <h1>{meta?.title}</h1>
            <p class="article__byline">
                {#if meta?.author}<span>By {meta.author}</span>{/if}
                {#if meta?.date}<span> · {meta.date}</span>{/if}
            </p>
            {#if meta?.summary}
                <p class="article__summary">{meta.summary}</p>
            {/if}
        </header>
        <div class="article__body">{@html content}</div>
    </article>
{:else}
    <p>Not found.</p>
{/if}
