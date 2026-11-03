import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createQueryCache } from '../lib/query-cache.mjs'
import { createLiveRefresh } from '../lib/live-refresh.mjs'

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
test('concurrent reads share one request and expire after the TTL', async () => {
    let clock = 0, calls = 0
    const cache = createQueryCache(() => clock)
    const loader = async () => ++calls
    assert.deepEqual(await Promise.all([cache.read('profile:a', loader, 10), cache.read('profile:a', loader, 10)]), [1, 1])
    clock = 9
    assert.equal(await cache.read('profile:a', loader, 10), 1)
    clock = 11
    assert.equal(await cache.read('profile:a', loader, 10), 2)
    assert.equal(await cache.read('profile:b', loader, 10), 3)
})
test('invalidation during a request cannot restore stale data', async () => {
    const cache = createQueryCache(), old = deferred()
    const first = cache.read('groups:a', () => old.promise)
    await Promise.resolve()
    cache.clear()
    assert.equal(await cache.read('groups:a', async () => 'new'), 'new')
    old.resolve('old')
    await first
    assert.equal(await cache.read('groups:a', async () => 'unexpected'), 'new')
})
test('failed requests are retried rather than cached', async () => {
    const cache = createQueryCache()
    await assert.rejects(cache.read('profile', async () => { throw Error('offline') }))
    assert.equal(await cache.read('profile', async () => 'online'), 'online')
})
test('Realtime bursts serialize reads and perform a final catch-up', async () => {
    const first = deferred()
    let calls = 0, active = 0, maxActive = 0
    const live = createLiveRefresh(async () => {
        calls++; active++; maxActive = Math.max(maxActive, active)
        if (calls === 1) await first.promise
        active--
    })
    const done = live.refresh()
    live.refresh(); live.refresh(); live.refresh()
    first.resolve()
    await done
    assert.equal(calls, 2)
    assert.equal(maxActive, 1)
    live.dispose()
    await live.refresh()
    assert.equal(calls, 2)
})
test('leaving a group view cancels queued refreshes', async () => {
    const first = deferred(); let calls = 0
    const live = createLiveRefresh(async () => { calls++; await first.promise })
    const done = live.refresh(); live.refresh(); live.dispose(); first.resolve()
    await done
    assert.equal(calls, 1)
})
