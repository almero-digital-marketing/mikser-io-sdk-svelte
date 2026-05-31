<script>
    let { children } = $props()
</script>

<header class="site-header">
    <a href="/">mikser hybrid demo</a>
    <a href="/admin" style="float:right">Admin</a>
</header>

<main class="content">
    {@render children()}
</main>
