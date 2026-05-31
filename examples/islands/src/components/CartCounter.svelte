<script>
    let { initial = '0' } = $props()
    let count = $state(Number(initial) || 0)
</script>

<div class="cart">
    <button class="cart__btn" onclick={() => count++}>Add to cart</button>
    <span class="cart__count">{count} item(s)</span>
</div>
