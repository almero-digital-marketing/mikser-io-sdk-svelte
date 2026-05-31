import PageView from './views/PageView.svelte'
import ArticleView from './views/ArticleView.svelte'
import ProductView from './views/ProductView.svelte'
import LandingView from './views/LandingView.svelte'

// Layout → view component lookup. The router picks the entry based on
// the catalog document's meta.layout; unknown layouts fall back to
// PageView via the consumer (see App.svelte).
export const viewForLayout = {
    page: PageView,
    article: ArticleView,
    product: ProductView,
    landing: LandingView,
}
