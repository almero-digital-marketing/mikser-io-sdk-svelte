<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    // Live nav — every published document with meta.nav: true appears,
    // ordered by meta.nav_order.
    const links = useDocuments(() => ({
        filter: { 'meta.nav': true },
        sort: { 'meta.nav_order': 1 },
        fields: ['id', 'route', 'meta'],
    }))
</script>

<nav class="nav">
    <a href="/" class="nav__brand">mikser</a>
    <ul class="nav__links">
        {#each links.documents as link (link.id)}
            <li><a href={link.route}>{link.meta?.title ?? link.route}</a></li>
        {/each}
    </ul>
</nav>
