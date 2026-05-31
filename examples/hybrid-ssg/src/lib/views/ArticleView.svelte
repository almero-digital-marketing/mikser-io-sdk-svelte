<script>
    // Receives a fully-loaded document — at prerender time from the
    // [...path]/+page.server.js load(), at runtime from useDocument in
    // the /admin route. The component itself doesn't care which.
    let { document } = $props()
</script>

{#if document}
    {@const { meta, content } = document}
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
{/if}
