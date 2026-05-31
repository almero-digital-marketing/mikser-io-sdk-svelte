import { mount } from 'svelte'
import CartCounter from '../components/CartCounter.svelte'

export function mountCart(selector = '[data-island="cart"]') {
    for (const el of document.querySelectorAll(selector)) {
        mount(CartCounter, { target: el, props: { ...el.dataset } })
    }
}
