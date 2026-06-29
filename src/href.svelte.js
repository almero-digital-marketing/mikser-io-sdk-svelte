// Multilingual href() — Svelte 5 reactive shell around sdk-api's pure
// createHrefIndex. The .svelte.js extension is required for $state /
// $effect / $derived runes.
import { setContext, getContext } from 'svelte'
import { createHrefIndex } from 'mikser-io-sdk-api'
import { useMikserClient } from './client.js'

const HREF_INDEX = Symbol('mikser-io.href-index')

/**
 * provideHrefIndex — call from a top-level component (or your root
 * layout's <script>) to build the href index and expose it to
 * descendants. The returned `index` getter is reactive — useHref reads
 * through it.
 *
 *   <script>
 *     import { provideHrefIndex } from 'mikser-io-sdk-svelte'
 *     provideHrefIndex({ defaultLang: 'en' })
 *   </script>
 *
 * Front-matter convention:
 *   meta.href:  '/about'           (logical reference)
 *   meta.lang:  'en'               (language this doc represents)
 *   meta.route: '/en/about'        (deployed URL)
 */
export function provideHrefIndex({
    client: clientArg,
    filter = { 'meta.href': { $exists: true } },
    defaultLang = 'default',
} = {}) {
    const client = clientArg ?? useMikserClient()
    let documents = $state.raw([])

    $effect(() => {
        const dispose = client.live(
            filter,
            (docs) => { documents = docs },
            { fields: ['id', 'meta'] },
        )
        return () => dispose?.()
    })

    const index = $derived(createHrefIndex(documents, { defaultLang }))

    const slot = {
        get index() { return index },
        defaultLang,
    }
    setContext(HREF_INDEX, slot)
    return slot
}

/**
 * Read the href index. Returns an object with `href`, `refFor`, and a
 * reactive `index` getter. **Do not destructure `index`** — that would
 * snapshot it at the call site. Either keep the returned object
 * (`const links = useHref(); links.index`) or read `href` / `refFor`
 * directly, which are plain functions that close over the live index.
 *
 *   <script>
 *     import { useHref } from 'mikser-io-sdk-svelte'
 *     import { locale } from '$lib/i18n'
 *     const { href } = useHref(() => locale.current)
 *   </script>
 *
 *   <a href={href('/about')}>About</a>
 *
 * `defaultLang` may be a string or a getter `() => string`. When the
 * caller doesn't pass a lang to href(), this is the fallback.
 */
export function useHref(defaultLang) {
    const slot = getContext(HREF_INDEX)
    if (!slot) {
        throw new Error(
            'useHref: provideHrefIndex() must be called in a parent component first'
        )
    }

    function resolveLang(lang) {
        return lang
            ?? (typeof defaultLang === 'function' ? defaultLang() : defaultLang)
            ?? slot.defaultLang
    }

    function href(ref, lang) {
        return slot.index.href(ref, resolveLang(lang))
    }

    function refFor(url) {
        return slot.index.refFor(url)
    }

    // Content companions — resolve the document a logical ref points at,
    // not just its URL. Read from the same live index, so they track
    // changes to the referenced document.
    function doc(ref, lang) {
        return slot.index.docFor(ref, resolveLang(lang))
    }

    function meta(ref, lang) {
        return slot.index.metaFor(ref, resolveLang(lang))
    }

    return {
        href,
        refFor,
        doc,
        meta,
        get index() { return slot.index },
    }
}

/**
 * useAlternates — alternate-language URLs for a given route.
 *
 *   <script>
 *     import { page } from '$app/state'
 *     import { useAlternates } from 'mikser-io-sdk-svelte'
 *     const alts = useAlternates({
 *         route: () => page.url.pathname,
 *         languages: ['en', 'fr', 'bg'],
 *     })
 *   </script>
 *
 *   {#each alts.alternates as { lang, url }}
 *     <a href={url}>{lang}</a>
 *   {/each}
 *
 * `languages` controls which alternates appear:
 *   - omitted: only languages that actually exist for the current ref
 *   - provided (array or getter): one entry per language, with fallback
 */
export function useAlternates({ route, languages } = {}) {
    if (route == null) {
        throw new Error('useAlternates: { route } is required')
    }
    const slot = getContext(HREF_INDEX)
    if (!slot) {
        throw new Error(
            'useAlternates: provideHrefIndex() must be called in a parent component first'
        )
    }

    const result = $derived.by(() => {
        const path = typeof route === 'function' ? route() : route
        const langs = typeof languages === 'function' ? languages() : languages
        return slot.index.alternates({ route: path, languages: langs })
    })

    return {
        get current()    { return result.current },
        get alternates() { return result.alternates },
    }
}
