# islands

mikser owns the HTML; **`mikser-io-sdk-svelte`** mounts interactive Svelte components into specific DOM nodes ("islands").

This is the progressive-enhancement model: the page is server-rendered HTML from mikser, and you sprinkle interactivity only where you need it.

## What it shows

- Mounting Svelte 5 component instances into arbitrary DOM nodes (`mount()` from `svelte`, one per node — not a single app root)
- Multiple independent islands on one page
- Reading mikser content from inside an island (via an explicit `client` prop, no Svelte context required)
- Passing data from HTML (`data-*` attributes) into a Svelte island as props

## Islands

| Mount point | Component | What it does |
| --- | --- | --- |
| `[data-island="search"]` | `SearchBox` | Live search over mikser documents |
| `[data-island="cart"]` | `CartCounter` | Client-side cart counter (reads `data-initial`) |
| `[data-island="booking"]` | `BookingForm` | Booking form with validation |

## Run

```bash
npm install
npm run dev
```

Open the example page that mikser would serve:

```
http://localhost:5173/example-page.html
```

The app reads `VITE_MIKSER_URL` (default `http://localhost:3001`).

## How it works

1. `main.js` calls the per-island mount functions in `src/islands/`.
2. Each mount function finds its `[data-island]` nodes and calls `mount(Component, { target: el, props: { ...dataset, ... } })`.
3. Islands that need the catalog (`SearchBox`) receive the mikser client as a prop and pass it to `useDocuments(query, { client })` — bypassing Svelte context entirely (each island is independent).
4. HTML `data-*` attributes are spread onto the component as props.

## Takeaway

You do not need to own the whole page. mikser renders the document; Svelte enhances just the interactive nodes. Each island is isolated with its own mount and (if needed) its own client. Svelte 5's `mount()` is the equivalent of "create one little app and stick it in this `<div>`."
