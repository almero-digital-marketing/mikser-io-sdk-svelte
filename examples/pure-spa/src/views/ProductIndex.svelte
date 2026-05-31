<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    const products = useDocuments(() => ({
        filter: { 'meta.layout': 'product' },
        sort: { 'meta.title': 1 },
    }))
</script>

<section class="product-index">
    <h1>Products</h1>
    <ul class="card-grid">
        {#each products.documents as product (product.id)}
            {@const { meta } = product}
            <li class="card product-card">
                <a href={product.route}>
                    {#if meta?.image}<img src={meta.image} alt={meta?.title} />{/if}
                    <h3>{meta?.title}</h3>
                    <p class="product-card__price">{meta?.price}</p>
                </a>
            </li>
        {/each}
    </ul>
</section>
