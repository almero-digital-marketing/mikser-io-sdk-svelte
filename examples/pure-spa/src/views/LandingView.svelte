<script>
    import { useDocument } from 'mikser-io-sdk-svelte'

    let { id } = $props()
    const landing = useDocument(() => id)
</script>

{#if landing.document}
    {@const { meta, content } = landing.document}
    <div class="landing">
        <section class="hero">
            <h1>{meta?.hero?.heading ?? meta?.title}</h1>
            {#if meta?.hero?.subheading}
                <p class="hero__sub">{meta.hero.subheading}</p>
            {/if}
            {#if meta?.cta?.href}
                <a class="hero__cta" href={meta.cta.href}>
                    {meta.cta.label ?? 'Learn more'}
                </a>
            {/if}
        </section>
        <div class="landing__body">{@html content}</div>
    </div>
{/if}
