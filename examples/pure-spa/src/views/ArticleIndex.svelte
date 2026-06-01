<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    const articles = useDocuments(() => ({
        filter: { 'meta.component': 'article' },
        sort: { 'meta.date': -1 },
        fields: ['id', 'route', 'meta'],
    }))
</script>

<section class="article-index">
    <h1>Articles</h1>
    {#if articles.loading}<p>Loading…</p>{/if}
    <ul class="article-list">
        {#each articles.documents as article (article.id)}
            {@const { meta } = article}
            <li class="article-list__item">
                <a href={article.route}><h2>{meta?.title}</h2></a>
                <p class="article-list__meta">
                    {#if meta?.author}<span>{meta.author}</span>{/if}
                    {#if meta?.date}<span> · {meta.date}</span>{/if}
                </p>
                {#if meta?.summary}<p>{meta.summary}</p>{/if}
            </li>
        {/each}
    </ul>
</section>
