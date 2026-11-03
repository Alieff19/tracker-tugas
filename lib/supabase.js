import { createClient } from '@supabase/supabase-js'
import { accountCache } from './query-cache.mjs'

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

// Keep callbacks synchronous; calling Auth methods here can deadlock the SDK.
let accountId
supabase.auth.onAuthStateChange((event, session) => {
    const nextId = session?.user?.id || null
    if (nextId !== accountId || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        accountCache.clear()
    }
    accountId = nextId
})
