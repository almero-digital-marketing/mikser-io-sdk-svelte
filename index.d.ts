// Type declarations for mikser-io-sdk-svelte.
//
// Svelte 5 reactive values returned from useDocument / useDocuments
// etc. are exposed as getters on a plain object. We type them as
// regular properties — the getter shape is an implementation detail
// that doesn't change how consumers read them in templates.

import type {
    EntitiesClient,
    Filter,
    ListQuery,
} from 'mikser-io-sdk-api'

// ---------------------------------------------------------------------------
// Client context
// ---------------------------------------------------------------------------

/**
 * Expose the entities client to descendants via Svelte's context API.
 * Call from a top-level component (or the SvelteKit root layout).
 */
export declare function setMikserClient(client: EntitiesClient): EntitiesClient

/**
 * Read the configured EntitiesClient from context. Useful for ad-hoc
 * calls like client.urlFor() or client.render().
 */
export declare function useMikserClient(): EntitiesClient

// ---------------------------------------------------------------------------
// Document reactives
// ---------------------------------------------------------------------------

export interface UseDocumentResult<T = unknown> {
    /** The resolved document, or null while loading / when missing. */
    readonly document: T | null
    /** True until the initial fetch resolves. */
    readonly loading:  boolean
    /** Populated when an error fires through onError. */
    readonly error:    unknown
    /** Manually re-trigger the subscription. */
    refresh(): void
}

export interface UseHookOptions {
    client?: EntitiesClient
}

/**
 * Live single-document reactive. `getId` may be a string or a getter
 * `() => string | null | undefined`. Getter form re-subscribes when
 * the upstream tracked state changes.
 */
export declare function useDocument<T = unknown>(
    getId: string | null | undefined | (() => string | null | undefined),
    options?: UseHookOptions,
): UseDocumentResult<T>

export interface UseDocumentsResult<T = unknown> {
    readonly documents: T[]
    readonly loading:   boolean
    readonly error:     unknown
    refresh(): void
}

/**
 * Live list reactive. `getQuery` may be a query object or a getter
 * `() => ListQuery`. Getter form re-subscribes when the upstream
 * tracked state changes.
 */
export declare function useDocuments<T = unknown>(
    getQuery?: ListQuery | (() => ListQuery),
    options?: UseHookOptions,
): UseDocumentsResult<T>

export interface ProvideCurrentDocumentOptions {
    /** Current-path source: a path string or a getter `() => string`. */
    route: string | (() => string | null | undefined)
    /** Override the injected client. */
    client?: EntitiesClient
    /** Map a path to the lookup filter (default `{ 'meta.route': path }`). */
    resolve?: (path: string) => Record<string, unknown>
    /** Extra filter clauses merged into the lookup (default none). */
    extraFilter?: Record<string, unknown>
    /** Restrict the projected fields (default all). */
    fields?: string[]
    /**
     * References to resolve. Defaults to the `$` wildcard — a document comes
     * with every reference resolved (ADR-0007). Pass `[]` to opt out, or a
     * path list to narrow it.
     */
    expand?: string[]
}

export interface CurrentDocumentSlot<T = unknown> {
    /** The current-route document, or null while loading / when missing. */
    readonly document: T | null
    /** True until the initial fetch resolves. */
    readonly loading:  boolean
}

/**
 * Provide one shared current-route document to descendants (Svelte context);
 * read it anywhere below with useCurrentDocument(). References resolve by
 * default (`$` wildcard) — pass `expand: []` to opt out.
 */
export declare function provideCurrentDocument<T = unknown>(
    options: ProvideCurrentDocumentOptions,
): CurrentDocumentSlot<T>

/** Read the shared current-route document from a provideCurrentDocument() ancestor. */
export declare function useCurrentDocument<T = unknown>(): CurrentDocumentSlot<T>

// ---------------------------------------------------------------------------
// Routing helpers
// ---------------------------------------------------------------------------

export interface GenerateMikserRoutesOptions<R = unknown> {
    client: EntitiesClient
    /** Default: `meta.published: true` + `meta.route` exists. */
    filter?: Filter
    /** Mapper applied to each catalog hit. Return shape is caller-defined. */
    mapRoute: (document: any) => R
}

/**
 * Build-time enumeration of catalog routes. Designed for SvelteKit's
 * `entries()` hook in `+page.server.js`, but the mapRoute return shape
 * is whatever the caller wants.
 */
export declare function generateMikserRoutes<R = unknown>(
    options: GenerateMikserRoutesOptions<R>,
): Promise<R[]>

export interface UseMikserPagesOptions<P = unknown> {
    client?: EntitiesClient
    filter?: Filter
    mapPage: (document: any) => P | null | undefined
}

export interface UseMikserPagesResult<P = unknown> {
    readonly items:   P[]
    readonly loading: boolean
    readonly error:   unknown
}

/**
 * Live reactive array of page entries from the catalog. Use for
 * content-driven menus, sitemaps, search indexes.
 */
export declare function useMikserPages<P = unknown>(
    options: UseMikserPagesOptions<P>,
): UseMikserPagesResult<P>

// ---------------------------------------------------------------------------
// href() — multilingual URL abstraction
// ---------------------------------------------------------------------------

export interface ProvideHrefIndexOptions {
    client?: EntitiesClient
    /** Default: `{ 'meta.href': { $exists: true } }`. */
    filter?: Filter
    /** Bucket for documents without meta.lang. Default 'default'. */
    defaultLang?: string
}

export type HrefIndex = Record<string, Record<string, string>>

export interface HrefIndexSlot {
    readonly index: HrefIndex
    readonly defaultLang: string
}

/**
 * Build the href index from the catalog and expose it to descendants.
 * Call once in a top-level component or root layout.
 */
export declare function provideHrefIndex(
    options?: ProvideHrefIndexOptions,
): HrefIndexSlot

export interface UseHrefResult {
    /**
     * Resolve a logical href + optional language to a real URL.
     * Returns the input unchanged when no entry matches.
     */
    href(ref: string, lang?: string): string
    /**
     * Reverse lookup — given a deployed URL, return the logical ref
     * (or null). Powers useAlternates().
     */
    refFor(url: string | null | undefined): string | null
    readonly index: HrefIndex
}

/**
 * Read the href index. `defaultLang` is the fallback when the caller
 * doesn't pass a lang to href() — may be a string or a getter.
 */
export declare function useHref(
    defaultLang?: string | (() => string),
): UseHrefResult

export interface Alternate {
    lang: string
    url:  string
}

export interface CurrentRoute {
    lang: string | null
    url:  string
    ref:  string
}

export interface UseAlternatesOptions {
    /** URL to find alternates for. String or getter. SvelteKit users typically pass `() => page.url.pathname`. */
    route: string | (() => string | null | undefined)
    /**
     * Optional list of languages. Omitted = only languages that exist
     * (right for hreflang). Provided = every language, with href()
     * fallback (right for switchers).
     */
    languages?: string[] | (() => string[])
}

export interface UseAlternatesResult {
    /** Alternates excluding the current page's own language. */
    readonly alternates: Alternate[]
    /** The matched current route, or null if no document corresponds. */
    readonly current:    CurrentRoute | null
}

export declare function useAlternates(
    options: UseAlternatesOptions,
): UseAlternatesResult

// ---------------------------------------------------------------------------
// asset() — preset URL convention + managed-entity lookup
// ---------------------------------------------------------------------------

export interface AssetRecord {
    url:   string
    /** Raw entity meta block — opaque (mime, dimensions, duration, …). */
    meta?: Record<string, unknown>
}

export interface AssetUrlOptions {
    /** Preset output format — replaces the source extension (.mp4 → .jpg). */
    ext?: string
}

export interface ProvideAssetIndexOptions {
    client?: EntitiesClient
    filter?: Filter
}

export type AssetIndex = Record<string, AssetRecord>

export interface AssetIndexSlot {
    readonly index: AssetIndex
}

export declare function provideAssetIndex(
    options?: ProvideAssetIndexOptions,
): AssetIndexSlot

export interface UseAssetResult {
    /**
     * Resolve a served ref to a deployed URL, baseUrl bound from the
     * installed client. Needs no provideAssetIndex.
     */
    url(ref?: string): string
    /**
     * Managed asset entity by reference → { url, meta } | null. Resolves
     * only when provideAssetIndex() is in a parent.
     */
    asset(ref: string): AssetRecord | null
    readonly index: AssetIndex | null
}

export declare function useAsset(): UseAssetResult

/**
 * Dev-mode load-failure warner: logs a warning when an <img>/<video>
 * fails to load. Returns a teardown function. No-op outside a browser.
 */
export declare function watchAssetFallbacks(options?: { doc?: Document; warn?: (message: string) => void }): () => void

// ---------------------------------------------------------------------------
// vector() — semantic search (pairs with mikser-io-sdk-vector)
// ---------------------------------------------------------------------------

/**
 * Shape the vector client must conform to. Match the one returned by
 * `createClient(...)` from `mikser-io-sdk-vector` — the framework SDK
 * doesn't import that package directly (it's an optional runtime
 * dependency), it just expects this surface.
 */
export interface MikserVectorClient {
    vector(storeName: string, options?: { token?: string }): {
        findSimilar(q: string, options?: { limit?: number }): Promise<{
            results: Array<{ id: string; distance: number; data?: any }>
        }>
    }
}

/**
 * Expose the vector client to descendants via Svelte's context API.
 * Call from a top-level component (typically the root layout).
 */
export declare function setMikserVectorClient(client: MikserVectorClient): MikserVectorClient

/**
 * Read the configured vector client. useSimilar reads it for you;
 * this is for ad-hoc calls.
 */
export declare function useMikserVectorClient(): MikserVectorClient

export interface UseSimilarOptions {
    /** Override the context client. Rare. */
    client?: MikserVectorClient
    /** Max hits per request. Default 5. */
    limit?: number
    /** ms to wait after the last query change before firing. Default 200. 0 = fire immediately. */
    debounce?: number
    /** Skip the request when the trimmed query is shorter than this. Default 1. */
    minLength?: number
}

export interface SimilarHit<T = unknown> {
    id: string
    distance: number
    data?: T
}

export interface UseSimilarResult<T = unknown> {
    /** Latest results. Empty array before the first response. */
    readonly results: SimilarHit<T>[]
    /** True while a request is in flight (not while debouncing). */
    readonly loading: boolean
    /** Populated when findSimilar() rejects. */
    readonly error:   unknown
    /** Force a fresh request against the current query. */
    refresh(): void
}

/**
 * Live semantic search reactive. `getQuery` is typically a getter
 * (`() => query`) so the effect tracks the rune; a plain string also
 * works but won't re-fire. Re-fires the search whenever the upstream
 * query changes, debounced. Stale responses are discarded — only the
 * most recently-issued query's response can update `results`.
 */
export declare function useSimilar<T = unknown>(
    storeName: string,
    getQuery: string | (() => string),
    options?: UseSimilarOptions,
): UseSimilarResult<T>

export type MikserStatus = 'connecting' | 'ready' | 'unreachable'

export interface UseMikserStatusOptions {
    /** Override the registered client. Default: client from setMikserClient. */
    client?: EntitiesClient
    /** Deadline before falling back to 'unreachable'. Default: 5000 ms. */
    timeoutMs?: number
}

export interface UseMikserStatusResult {
    /** Current connection status. Reactive — Svelte tracks reads of this getter. */
    readonly current: MikserStatus
}

/**
 * Connection-status rune. Returns a reactive holder whose `.current`
 * starts at 'connecting', moves to 'ready' on the first successful
 * list() probe, and moves to 'unreachable' on probe failure or deadline
 * timeout.
 *
 * One-shot: once `.current` leaves 'connecting' it does not flip back.
 * For a live health signal, watch the `error` field of useDocuments instead.
 *
 * @example
 *   const status = useMikserStatus()
 *   {#if status.current === 'ready'} ... {/if}
 */
export declare function useMikserStatus(options?: UseMikserStatusOptions): UseMikserStatusResult

// ---------------------------------------------------------------------------
// Reactive content cache
// ---------------------------------------------------------------------------

/**
 * Reactive wrapper over the sdk-api cache. Reads are tracked by Svelte's
 * runes, so components re-render when cached content is loaded or
 * invalidated.
 */
export interface ReactiveContentCache {
    /** Fetch (and cache) the envelope for a query; resolves from cache when present. */
    load(query?: object, options?: object): Promise<object>
    /** Synchronously read a cached envelope without fetching, or undefined when absent. */
    read(query?: object): object | undefined
    /** Drop the cached envelope for the query and notify subscribers. */
    invalidate(query?: object): void
    /** Resolve a single document by href; references resolve by default (`$` wildcard, `expand: []` to opt out). */
    document(href: string, options?: { expand?: string[] }): Promise<any | null>
    /** Synchronous form of document() — returns the cached document or null. */
    documentSync(href: string, options?: { expand?: string[] }): any | null
    /** The underlying sdk-api cache instance. */
    cache: any
}

/** Build a {@link ReactiveContentCache} over an entities client. */
export declare function createReactiveCache(docs: any): ReactiveContentCache
