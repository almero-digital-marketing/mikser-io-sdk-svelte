<script>
    import { useDocument } from 'mikser-io-sdk-svelte'

    let { id } = $props()
    const product = useDocument(() => id)
</script>

{#if product.document}
    {@const { meta, content } = product.document}
    <article class="product">
        <div class="product__media">
            {#if meta?.image}
                <img src={meta.image} alt={meta?.title} />
            {/if}
        </div>
        <div class="product__info">
            <h1>{meta?.title}</h1>
            <p class="product__price">{meta?.price}</p>
            <p class="product__sku">SKU: {meta?.sku}</p>
            <p class="product__stock" class:in-stock={meta?.in_stock}>
                {meta?.in_stock ? 'In stock' : 'Out of stock'}
            </p>
            <button disabled={!meta?.in_stock}>
                {meta?.in_stock ? 'Add to cart' : 'Out of stock'}
            </button>
            <div class="product__description">{@html content}</div>
        </div>
    </article>
{/if}
