// Asset resolution — Svelte 5 reactive shell around sdk-api's format-
// neutral asset helpers.
//
//   useAsset().url(ref)        — join a deployed served path (meta.url or
//     meta.presets.<name>) to the client base; pure, needs no provide.
//     The common case (ADR-0011).
//   useAsset().asset(ref)      — managed-entity metadata lookup; only
//     resolves when provideAssetIndex() is in a parent. { url, meta } | null.
import { setContext, getContext } from 'svelte'
import { deployedUrl, createAssetIndex } from 'mikser-io-sdk-api'
import { useMikserClient, MIKSER_CLIENT } from './client.js'

export { watchAssetFallbacks } from 'mikser-io-sdk-api'

const ASSET_INDEX = Symbol('mikser-io.asset-index')

/**
 * provideAssetIndex — build and provide a reactive index of managed asset
 * entities. Only needed for useAsset().asset(ref); the url()
 * convention helper needs no provide. Call once in a top-level component.
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
 * Asset access. Returns `{ url, asset, index }`.
 *
 *   <script>
 *     import { useAsset } from 'mikser-io-sdk-svelte'
 *     const { url } = useAsset()
 *   </script>
 *
 *   <video src={url(clip.meta.url)}
 *          poster={url(clip.meta.presets.poster)}></video>
 *
 * `url(ref)` joins a deployed served path (from `meta.url` /
 * `meta.presets.<name>`, expanded via the catalog) to the client base;
 * needs no provide. `asset(ref)` → `{ url, meta } | null`, resolves only
 * when provideAssetIndex() is in a parent.
 */
export function useAsset() {
    const client = getContext(MIKSER_CLIENT)
    const slot = getContext(ASSET_INDEX)
    const baseUrl = client?.baseUrl ?? ''

    function url(ref) {
        return deployedUrl(ref, { baseUrl })
    }

    function asset(ref) {
        return slot ? slot.index.asset(ref) : null
    }

    return {
        url,
        asset,
        get index() { return slot ? slot.index : null },
    }
}
