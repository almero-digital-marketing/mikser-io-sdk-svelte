import { mount } from 'svelte'
import { createClient } from 'mikser-io-sdk-api'
import SearchBox from '../components/SearchBox.svelte'

const MIKSER_URL = import.meta.env.VITE_MIKSER_URL || 'http://localhost:3001'
const client = createClient({ url: MIKSER_URL }).entities('public')

export function mountSearch(selector = '[data-island="search"]') {
    for (const el of document.querySelectorAll(selector)) {
        mount(SearchBox, {
            target: el,
            props: { ...el.dataset, client },
        })
    }
}
