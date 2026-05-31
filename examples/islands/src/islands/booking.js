import { mount } from 'svelte'
import BookingForm from '../components/BookingForm.svelte'

export function mountBooking(selector = '[data-island="booking"]') {
    for (const el of document.querySelectorAll(selector)) {
        mount(BookingForm, { target: el, props: { ...el.dataset } })
    }
}
