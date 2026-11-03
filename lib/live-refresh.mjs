// Serialize refreshes so a slow older response cannot overwrite a newer event.
export function createLiveRefresh(load, onError = () => {}) {
    let running = false, again = false, disposed = false
    const refresh = async () => {
        if (disposed) return
        if (running) { again = true; return }
        running = true
        try {
            do {
                again = false
                try { await load() } catch (error) { onError(error) }
            } while (again && !disposed)
        } finally { running = false }
    }
    return { refresh, dispose() { disposed = true; again = false } }
}
