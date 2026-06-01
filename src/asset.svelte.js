// Asset / image reference resolution — Svelte 5 reactive shell around
// sdk-api's pure createAssetIndex.
import { setContext, getContext } from 'svelte'
import { createAssetIndex } from 'mikser-io-sdk-api'
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
    let assets = $state.raw([])

    $effect(() => {
        const dispose = client.live(
            filter,
            (docs) => { assets = docs },
            { fields: ['id', 'meta'] },
        )
        return () => dispose?.()
    })

    const index = $derived(createAssetIndex(assets))

    const slot = {
        get index() { return index },
    }
    setContext(ASSET_INDEX, slot)
    return slot
}

/**
 * Read the asset index. Returns an object with `asset`, `image`, and a
 * reactive `index` getter.
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
 * Both return null for unresolved refs.
 *
 * Destructuring `{ asset, image } = useAsset()` is safe — they're
 * plain functions that close over the live index. Destructuring
 * `{ index }` would snapshot it; keep the object reference instead if
 * you need to read `.index` reactively.
 */
export function useAsset() {
    const slot = getContext(ASSET_INDEX)
    if (!slot) {
        throw new Error(
            'useAsset: provideAssetIndex() must be called in a parent component first'
        )
    }

    function asset(ref) {
        return slot.index.asset(ref)
    }

    function image(ref) {
        return slot.index.image(ref)
    }

    return {
        asset,
        image,
        get index() { return slot.index },
    }
}
