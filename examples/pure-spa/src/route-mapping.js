import PageView from './views/PageView.svelte'
import ArticleView from './views/ArticleView.svelte'
import ProductView from './views/ProductView.svelte'
import LandingView from './views/LandingView.svelte'

// Component → view lookup. The router picks the entry based on
// meta.component; unknown components fall back to PageView via the
// consumer (see App.svelte).
//
// Dispatch is on meta.component, not meta.layout — layout stays
// reserved for mikser's SSG render pipeline (the islands example
// uses it). Keeping them separate avoids "layout 'page' not found"
// warnings when a SPA-only component has no matching template.
export const viewForComponent = {
    page: PageView,
    article: ArticleView,
    product: ProductView,
    landing: LandingView,
}

// Resolve URL path: prefer meta.route, fall back to destination.
export function routeFor(document) {
    if (document?.meta?.route) return document.meta.route
    if (document?.destination) {
        return document.destination
            .replace(/\/index\.html?$/, '/')
            .replace(/\.html?$/, '')
    }
    return null
}
