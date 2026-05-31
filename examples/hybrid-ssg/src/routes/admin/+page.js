// /admin runs as an SPA on top of the static build. Disable prerender
// so adapter-static serves it via the fallback page (admin.html).
export const prerender = false
export const ssr = false
