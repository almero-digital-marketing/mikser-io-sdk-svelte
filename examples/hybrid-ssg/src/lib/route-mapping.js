import PageView from './views/PageView.svelte'
import ArticleView from './views/ArticleView.svelte'
import ProductView from './views/ProductView.svelte'
import LandingView from './views/LandingView.svelte'

export const viewForLayout = {
    page: PageView,
    article: ArticleView,
    product: ProductView,
    landing: LandingView,
}
