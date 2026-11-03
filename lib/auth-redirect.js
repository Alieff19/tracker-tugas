// Keep authentication navigation on this application, including encoded/backslash paths.
export function safeRedirect(value) {
    if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || /[\\\x00-\x20]/.test(value)) return '/dashboard'
    try {
        const decoded = decodeURIComponent(value)
        if (/^\/\//.test(decoded) || /[\\\x00-\x20]/.test(decoded)) return '/dashboard'
        return value
    } catch {
        return '/dashboard'
    }
}
