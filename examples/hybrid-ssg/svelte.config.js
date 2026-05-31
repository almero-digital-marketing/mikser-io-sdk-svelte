import adapter from '@sveltejs/adapter-static'

export default {
    kit: {
        // Prerender every reachable page by default. The /admin route opts
        // out (it needs runtime SSE) — it's served as the SPA fallback.
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: 'admin.html',
            precompress: false,
            strict: false,
        }),
    },
}
