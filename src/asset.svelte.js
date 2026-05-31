// Asset / image reference resolution — same provider/use pattern as
// href, scoped to asset entities.
import { setContext, getContext } from 'svelte'
import { useMikserClient } from './client.js'

const ASSET_INDEX = Symbol('mikser-io.asset-index')

/**
 * provideAssetIndex — build and provide a reactive asset index. Call
 * once in a top-level component (or root layout), then read it with
 * useAsset() anywhere below.
 *
 *   <script>
 *     import { provideAssetIndex } from 'mikser-io-sdk-svelte'
 *     provideAssetIndex()
 *   </script>
 */
export function provideAssetIndex({
    client: clientArg,
    filter = { type: 'asset' },
} = {}) {
    const client = clientArg ?? useMikserClient()
    let index = $state.raw({})

    $effect(() => {
        const dispose = client.live(
            filter,
            (assets) => {
                const next = {}
                for (const a of assets) {
                    next[a.id] = {
                        url:    a.meta?.destination ?? a.meta?.url ?? a.id,
                        width:  a.meta?.width,
                        height: a.meta?.height,
                        srcset: a.meta?.srcset,
                        alt:    a.meta?.alt,
                        meta:   a.meta,
                    }
                }
                index = next
            },
            { fields: ['id', 'meta'] },
        )
        return () => dispose?.()
    })

    const slot = {
        get index() { return index },
    }
    setContext(ASSET_INDEX, slot)
    return slot
}

/**
 * Read the asset index. Returns `{ asset, image, index }`.
 *
 *   <script>
 *     import { useAsset } from 'mikser-io-sdk-svelte'
 *     const { image } = useAsset()
 *   </script>
 *
 *   <img {...image('/assets/hero.jpg')} />
 *
 * `asset(ref)` returns the full record (url + dimensions + meta).
 * `image(ref)` returns `{ src, width, height, srcset, alt }` suitable
 * for spreading onto an <img> in a Svelte template (Svelte uses
 * lowercase HTML attribute names, so `srcset` not `srcSet`).
 *
 * Returns null for unresolved refs.
 */
export function useAsset() {
    const slot = getContext(ASSET_INDEX)
    if (!slot) {
        throw new Error(
            'useAsset: provideAssetIndex() must be called in a parent component first'
        )
    }

    function asset(ref) {
        return slot.index[ref] ?? null
    }

    function image(ref) {
        const a = slot.index[ref]
        if (!a) return null
        return {
            src:    a.url,
            width:  a.width,
            height: a.height,
            srcset: a.srcset,    // lowercase — Svelte template attr name
            alt:    a.alt,
        }
    }

    return {
        asset,
        image,
        get index() { return slot.index },
    }
}
