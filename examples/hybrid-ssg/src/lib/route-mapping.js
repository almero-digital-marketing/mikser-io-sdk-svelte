import PageView from './views/PageView.svelte'
import ArticleView from './views/ArticleView.svelte'
import ProductView from './views/ProductView.svelte'
import LandingView from './views/LandingView.svelte'

// Dispatch by meta.component, not meta.layout — layout stays free
// for mikser's SSG render pipeline (islands example uses it).
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
