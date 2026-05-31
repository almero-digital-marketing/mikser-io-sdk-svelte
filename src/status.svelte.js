// Connection-status rune.
//
// `useMikserStatus()` answers the simplest question about a mikser
// backend: is it reachable from this browser right now? Returns a
// reactive holder whose `.current` is 'connecting', 'ready', or
// 'unreachable'.
//
// The point is to give the consumer something to render with — a
// loading state, a "can't reach the server" message, anything other
// than a silent forever-pending screen.
//
// Implementation notes:
//   - Probe is `client.list({ limit: 1 })` — single round trip, cheap,
//     uses the same configured baseUrl.
//   - Deadline races the probe. Whichever resolves first wins.
//   - Once settled, the value does not flip back. This is a one-shot
//     connection check, not a heartbeat. For live health, watch the
//     `error` field of useDocuments instead.
//
// Returned shape uses a getter so callers can read it as
// `status.current` and Svelte's reactivity picks up changes — same
// pattern useMikserPages / useDocument use elsewhere in this SDK.

import { onMount } from 'svelte'
import { useMikserClient } from './client.js'

export function useMikserStatus({ client: clientArg, timeoutMs = 5000 } = {}) {
    const client = clientArg ?? useMikserClient()
    let status = $state('connecting')

    onMount(() => {
        let cancelled = false
        client.list({ limit: 1 }).then(
            () => { if (!cancelled && status === 'connecting') status = 'ready' },
            () => { if (!cancelled && status === 'connecting') status = 'unreachable' },
        )
        const timeoutId = setTimeout(() => {
            if (!cancelled && status === 'connecting') status = 'unreachable'
        }, timeoutMs)
        return () => { cancelled = true; clearTimeout(timeoutId) }
    })

    return {
        get current() { return status },
    }
}
