// Minimal pushState path router. The exported `router` object owns the
// current pathname in a $state rune and exposes:
//
//   router.path             — reactive getter; reads inside $effect /
//                             $derived / templates re-run on change
//   router.navigate(to)     — push a new history entry and update path
//
// Pattern: factory function with rune state captured in closure, returned
// as an object with getters. This is the canonical Svelte 5 way to share
// reactive state across modules (analogous to a Svelte 4 store).
function createRouter() {
    let path = $state(typeof window === 'undefined' ? '/' : window.location.pathname)

    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            path = window.location.pathname
        })
    }

    return {
        get path() { return path },
        navigate(to) {
            if (to === path) return
            history.pushState({}, '', to)
            path = to
        },
    }
}

export const router = createRouter()
