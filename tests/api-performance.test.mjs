import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { accountCache } from '../lib/query-cache.mjs'

// Exercise the real API wrappers with a transport stub; no test accounts or tokens.
const source = await readFile(new URL('../lib/api.js', import.meta.url), 'utf8')
let user = { id: 'account-a' }, reads = 0, channels = []
const mock = {
    auth: { getSession: async () => ({ data: { session: { user } } }) },
    from(table) {
        const query = {}
        for (const method of ['select', 'eq', 'single', 'order', 'update']) query[method] = () => query
        query.then = (resolve, reject) => { reads++; return Promise.resolve({ data: { table, owner: user.id } }).then(resolve, reject) }
        return query
    },
    rpc: async () => ({ data: { status: 'under_review' } }),
    channel(name) {
        const ch = { name, handlers: {}, on(event, filter, cb) { this.handlers[event] = cb; return this }, subscribe() { return this } }
        channels.push(ch)
        return ch
    },
    removeChannel(ch) { ch.removed = true },
}
globalThis.__gotaksApiTestTransport = mock
const transport = 'data:text/javascript,' + encodeURIComponent('export const supabase = globalThis.__gotaksApiTestTransport')
const patched = source.replace("'./supabase'", JSON.stringify(transport))
    .replace("'./auth-redirect'", JSON.stringify(new URL('../lib/auth-redirect.js', import.meta.url).href))
    .replace("'./query-cache.mjs'", JSON.stringify(new URL('../lib/query-cache.mjs', import.meta.url).href))
    .replace("'./live-refresh.mjs'", JSON.stringify(new URL('../lib/live-refresh.mjs', import.meta.url).href))
const { Auth, Grup, Tugas, TugasAnggota } = await import('data:text/javascript,' + encodeURIComponent(patched))
delete globalThis.__gotaksApiTestTransport

test('dashboard requests avoid remote getUser and deduplicate profile/group reads per account', async () => {
    accountCache.clear(); reads = 0
    await Promise.all([Auth.profilSaatIni(), Auth.profilSaatIni(), Grup.daftarSaya(), Grup.daftarSaya()])
    assert.equal(reads, 2)
    await Auth.profilSaatIni(); await Grup.daftarSaya()
    assert.equal(reads, 2)
    user = { id: 'account-b' }
    assert.equal((await Auth.profilSaatIni()).owner, 'account-b')
    assert.equal(reads, 3)
    await TugasAnggota.selesaikan('task')
    await Auth.profilSaatIni()
    assert.equal(reads, 4, 'successful mutation invalidates snapshots')
})

test('database events, reconnect, focus and cleanup remain wired through the actual API', async () => {
    const savedWindow = globalThis.window, savedDocument = globalThis.document
    const win = Object.assign(new EventTarget(), { setInterval, clearInterval })
    const doc = Object.assign(new EventTarget(), { hidden: false })
    globalThis.window = win; globalThis.document = doc
    let refreshes = 0
    const tick = () => new Promise(resolve => setImmediate(resolve))
    let stop
    try {
        stop = Tugas.pantau('group', async () => { refreshes++ })
        await tick(); assert.equal(refreshes, 1)
        channels.at(-1).handlers.postgres_changes({ new: { status: 'under_review' } })
        await tick(); assert.equal(refreshes, 2)
        channels.at(-1).handlers.system({ status: 'ok' })
        await tick(); assert.equal(refreshes, 3)
        win.dispatchEvent(new Event('focus'))
        await tick(); assert.equal(refreshes, 4)
        stop(); stop = null
        win.dispatchEvent(new Event('online'))
        await tick(); assert.equal(refreshes, 4)
        assert(channels.at(-1).removed)
    } finally {
        stop?.(); globalThis.window = savedWindow; globalThis.document = savedDocument
    }
})
