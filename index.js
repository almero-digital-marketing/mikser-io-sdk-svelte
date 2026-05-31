// mikser-io-sdk-svelte
//
// Svelte 5 (runes) primitives and SvelteKit integration helpers for a
// mikser-io server. Pairs with mikser-io-sdk-api — get the entities
// client from there, call setMikserClient(client) in a top-level
// component, then use the rest of the SDK below it.
//
// This file is a re-export barrel. Implementations live in ./src:
//
//   src/client.js               setMikserClient, useMikserClient
//   src/documents.svelte.js     useDocument, useDocuments
//   src/router.svelte.js        useMikserPages, generateMikserRoutes
//   src/href.svelte.js          provideHrefIndex, useHref, useAlternates
//   src/asset.svelte.js         provideAssetIndex, useAsset
//   src/vector.svelte.js        setMikserVectorClient,
//                               useMikserVectorClient, useSimilar
//                               (semantic search; pairs with
//                               mikser-io-sdk-vector)
//
// Modules with the .svelte.js suffix participate in Svelte 5's compiler
// pipeline and may use $state / $effect / $derived runes. The plain
// .js modules don't need them.

export { setMikserClient, useMikserClient }    from './src/client.js'
export { useDocument, useDocuments }           from './src/documents.svelte.js'
export { useMikserPages, generateMikserRoutes } from './src/router.svelte.js'
export { provideHrefIndex, useHref, useAlternates } from './src/href.svelte.js'
export { provideAssetIndex, useAsset }         from './src/asset.svelte.js'
export {
    setMikserVectorClient,
    useMikserVectorClient,
    useSimilar,
} from './src/vector.svelte.js'
