<script>
    let { data } = $props()
</script>

<section class="home">
    <h1>Welcome</h1>
    <p>
        This is the prerendered public side of a SvelteKit + mikser app.
        Every route below is a static HTML file built from the mikser
        catalog. The <a href="/admin">/admin</a> route runs as a live SPA
        on top of the same content.
    </p>

    <h2>Pages</h2>
    <ul>
        {#each data.navDocs as page (page.id)}
            <li><a href={page.route}>{page.meta?.title}</a></li>
        {/each}
    </ul>
</section>
