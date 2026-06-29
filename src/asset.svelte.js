// Asset resolution — Svelte 5 reactive shell around sdk-api's format-
// neutral asset helpers.
//
//   useAsset().assetUrl(source, preset, { ext })  — preset → derivative
//     URL by convention; pure, needs no provide (just the client's
//     baseUrl). The common case.
//   useAsset().asset(ref)                          — managed-entity
//     metadata lookup; only resolves when provideAssetIndex() is in a
//     parent. Returns { url, meta } | null.
import { setContext, getContext } from 'svelte'
import { assetUrl as buildAssetUrl, createAssetIndex } from 'mikser-io-sdk-api'
import { useMikserClient, MIKSER_CLIENT } from './client.js'

const ASSET_INDEX = Symbol('mikser-io.asset-index')

/**
 * provideAssetIndex — build and provide a reactive index of managed asset
 * entities. Only needed for useAsset().asset(ref); the assetUrl()
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
 * Asset access. Returns `{ assetUrl, asset, index }`.
 *
 *   <script>
 *     import { useAsset } from 'mikser-io-sdk-svelte'
 *     const { assetUrl } = useAsset()
 *   </script>
 *
 *   <video src={assetUrl(clip, 'presentation')}
 *          poster={assetUrl(clip, 'poster', { ext: 'jpg' })}></video>
 *
 * `assetUrl(source, preset, { ext })` builds the derivative URL by
 * convention, baseUrl from the installed client; needs no provide.
 * `asset(ref)` → `{ url, meta } | null`, resolves only when
 * provideAssetIndex() is in a parent.
 */
export function useAsset() {
    const client = getContext(MIKSER_CLIENT)
    const slot = getContext(ASSET_INDEX)
    const baseUrl = client?.baseUrl ?? ''

    function assetUrl(source, preset, options = {}) {
        return buildAssetUrl(source, preset, { baseUrl, ...options })
    }

    function asset(ref) {
        return slot ? slot.index.asset(ref) : null
    }

    return {
        assetUrl,
        asset,
        get index() { return slot ? slot.index : null },
    }
}
