// Multilingual href() — abstract logical references (/about) from
// deployed URLs (/en/about, /fr/a-propos). Mirror of the Vue / React
// implementations, with Svelte 5 runes for live reactivity and
// setContext / getContext for the index slot.
//
// .svelte.js extension required — uses $state.raw + $effect.
import { setContext, getContext } from 'svelte'
import { useMikserClient } from './client.js'

const HREF_INDEX = Symbol('mikser-io.href-index')

/**
 * provideHrefIndex — call from a top-level component (or your root
 * layout's <script>) to build the href→{lang: url} index and expose it
 * to descendants. The returned `index` getter is reactive — useHref
 * reads through it.
 *
 *   <script>
 *     import { provideHrefIndex } from 'mikser-io-sdk-svelte'
 *     provideHrefIndex({ defaultLang: 'en' })
 *   </script>
 *
 * Front-matter convention:
 *   meta.href:  '/about'           (logical reference)
 *   meta.lang:  'en'               (which language this doc represents)
 *   meta.route: '/en/about'        (actual URL — what useHref returns)
 */
export function provideHrefIndex({
    client: clientArg,
    filter = { 'meta.href': { $exists: true } },
    defaultLang = 'default',
} = {}) {
    const client = clientArg ?? useMikserClient()
    let index = $state.raw({})

    $effect(() => {
        const dispose = client.live(
            filter,
            (docs) => {
                const next = {}
                for (const doc of docs) {
                    const ref = doc.meta?.href
                    if (!ref) continue
                    const lang = doc.meta?.lang ?? defaultLang
                    const url  = doc.meta?.route ?? doc.meta?.destination ?? ref
                    if (!next[ref]) next[ref] = {}
                    next[ref][lang] = url
                }
                index = next
            },
            { fields: ['id', 'meta'] },
        )
        return () => dispose?.()
    })

    const slot = {
        get index() { return index },
        defaultLang,
    }
    setContext(HREF_INDEX, slot)
    return slot
}

/**
 * Read the href index. Returns `{ href, refFor, index }`.
 *
 *   <script>
 *     import { useHref } from 'mikser-io-sdk-svelte'
 *     import { locale } from '$lib/i18n'           // your store / rune
 *     const { href } = useHref(() => locale.current)
 *   </script>
 *
 *   <a href={href('/about')}>About</a>
 *   <a href={href('/about', 'fr')}>Voir en français</a>
 *
 * `defaultLang` may be a string or a getter `() => string`. When the
 * caller doesn't pass a lang to href(), this is the fallback.
 *
 * Resolution: requested lang → 'default' bucket → any available
 * language → the input reference (so broken refs stay visible instead
 * of silently becoming undefined).
 */
export function useHref(defaultLang) {
    const slot = getContext(HREF_INDEX)
    if (!slot) {
        throw new Error(
            'useHref: provideHrefIndex() must be called in a parent component first'
        )
    }

    function href(ref, lang) {
        const target = lang
            ?? (typeof defaultLang === 'function' ? defaultLang() : defaultLang)
            ?? slot.defaultLang
            ?? 'default'
        const entry = slot.index[ref]
        if (!entry) return ref
        return entry[target]
            ?? entry['default']
            ?? Object.values(entry)[0]
            ?? ref
    }

    function refFor(url) {
        if (url == null) return null
        for (const [ref, byLang] of Object.entries(slot.index)) {
            if (Object.values(byLang).includes(url)) return ref
        }
        return null
    }

    return {
        href,
        refFor,
        get index() { return slot.index },
    }
}

/**
 * useAlternates — alternate-language URLs for a given route. Powers
 * language switchers and SEO hreflang tags.
 *
 *   <script>
 *     import { page } from '$app/state'        // SvelteKit's route ref
 *     import { useAlternates } from 'mikser-io-sdk-svelte'
 *     const langs = ['en', 'fr', 'bg']
 *     const alts = useAlternates({
 *         route: () => page.url.pathname,
 *         languages: langs,
 *     })
 *   </script>
 *
 *   {#each alts.alternates as { lang, url }}
 *     <a href={url}>{lang}</a>
 *   {/each}
 *
 * `route` is required — string or getter. SvelteKit users typically
 * pass `() => page.url.pathname`.
 *
 * `languages` controls which alternates appear:
 *   - omitted: only languages that actually exist for the current
 *     ref. Right for hreflang tags.
 *   - provided (array or getter): one entry per language, falling back
 *     via href() when a real translation doesn't exist. Right for
 *     language switchers.
 *
 * The current page's own language is excluded from `alternates`.
 */
export function useAlternates({ route, languages } = {}) {
    if (route == null) {
        throw new Error('useAlternates: { route } is required')
    }
    const { href, refFor, index } = useHref()

    const current = $derived.by(() => {
        const path = typeof route === 'function' ? route() : route
        if (path == null) return null
        const ref = refFor(path)
        if (ref == null) return null
        const entry = index[ref] ?? {}
        const lang = Object.entries(entry).find(([, url]) => url === path)?.[0] ?? null
        return { lang, url: path, ref }
    })

    const alternates = $derived.by(() => {
        const c = current
        if (!c) return []
        const entry = index[c.ref] ?? {}
        const requested = typeof languages === 'function' ? languages() : languages

        if (requested && Array.isArray(requested)) {
            return requested
                .filter(lang => lang !== c.lang)
                .map(lang => ({ lang, url: href(c.ref, lang) }))
        }
        return Object.entries(entry)
            .filter(([lang]) => lang !== c.lang && lang !== 'default')
            .map(([lang, url]) => ({ lang, url }))
    })

    return {
        get current()    { return current },
        get alternates() { return alternates },
    }
}
