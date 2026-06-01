<script>
    import { useDocuments } from 'mikser-io-sdk-svelte'

    // Live nav — every published document with meta.nav: true appears,
    // ordered by meta.nav_order. The narrow `fields` projection keeps
    // the response small even on a big catalog. The dev-mode wide-list
    // warning would fire without it.
    const links = useDocuments(() => ({
        filter: { 'meta.nav': true, 'meta.published': true },
        sort: { 'meta.nav_order': 1 },
        fields: ['id', 'meta.title', 'meta.route'],
    }))
</script>

<nav class="nav">
    <a href="/" class="nav__brand">mikser</a>
    <ul class="nav__links">
        {#each links.documents as link (link.id)}
            <li><a href={link.meta?.route ?? '/'}>{link.meta?.title}</a></li>
        {/each}
    </ul>
</nav>
