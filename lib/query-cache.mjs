// Memory only: no private query results are persisted in browser storage.
export function createQueryCache(now = Date.now) {
    const entries = new Map()
    let generation = 0
    return {
        clear() { generation++; entries.clear() },
        read(key, loader, ttl = 30000) {
            const existing = entries.get(key)
            if (existing && (existing.pending || existing.until > now())) return existing.promise
            const version = generation
            const entry = { pending: true, until: 0 }
            entry.promise = Promise.resolve().then(loader).then(value => {
                if (generation === version && entries.get(key) === entry) {
                    entry.pending = false
                    entry.until = now() + ttl
                }
                return value
            }, error => {
                if (entries.get(key) === entry) entries.delete(key)
                throw error
            })
            entries.set(key, entry)
            return entry.promise
        },
    }
}

export const accountCache = createQueryCache()
export const publicCache = createQueryCache()
