import { mountSearch } from './islands/search.js'
import { mountCart } from './islands/cart.js'
import { mountBooking } from './islands/booking.js'

// mikser owns the page HTML. We find each [data-island] node and mount
// the matching Svelte component into it — independent mounts, not one
// app root. Data attributes on the node are passed in as props.
mountSearch()
mountCart()
mountBooking()
