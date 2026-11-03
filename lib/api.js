import { supabase } from './supabase'
import { safeRedirect } from './auth-redirect'
import { accountCache, publicCache } from './query-cache.mjs'
import { createLiveRefresh } from './live-refresh.mjs'

let channelId = 0

// Database functions raise Indonesian messages; translate them for the English UI
const ERROR_EN = {
    'Harus login dulu': 'Please sign in first',
    'Nama grup minimal 3 karakter': 'Group name must be at least 3 characters',
    'Kode undangan tidak valid': 'That invite code is not valid',
    'Kamu sudah anggota grup ini': 'You are already a member of this group',
    'Grup sudah penuh (maksimal 5 anggota)': 'This group is full (maximum 5 members)',
    'Ketua tidak bisa keluar selama masih ada anggota lain di grup':
        'The leader cannot leave while other members are still in the group',
    'Hanya ketua yang bisa mengirim tugas': 'Only the leader can publish tasks',
    'Minimal 2 anggota sebelum tugas bisa dikirim':
        'At least 2 members are required before publishing tasks',
    'Tidak ada tugas draft untuk dikirim': 'There are no drafts to publish',
    'Tugas tidak ditemukan': 'Task not found',
    'Kamu bukan anggota grup ini': 'You are not a member of this group',
    'Bukan anggota grup': 'You are not a member of this group',
    'Tugas ini tidak bisa diambil': 'This task is no longer available',
    'Tugas ini dikunci': 'This task is locked',
    'Tugas harus berstatus doing': 'This task must be in progress',
    'Hanya pemilik tugas yang bisa menandai selesai':
        'Only the assignee can submit this task',
    'Hanya ketua yang bisa menyetujui tugas': 'Only the leader can approve tasks',
    'Tugas harus berstatus under_review': 'This task must be in review',
    'Catatan revisi wajib diisi saat menolak tugas':
        'A note is required when requesting changes',
    'Hanya ketua yang bisa menolak tugas': 'Only the leader can request changes',
    'Hanya tugas berstatus doing yang bisa dilepas': 'Only in-progress tasks can be released',
    'Kamu bukan pemilik tugas ini': 'You are not the assignee of this task',
    'Hanya ketua yang bisa melepas paksa tugas': 'Only the leader can unassign tasks',
    'Hanya tugas berstatus doing yang bisa dilepas paksa':
        'Only in-progress tasks can be unassigned',
    'Hanya ketua yang bisa membuka kembali tugas': 'Only the leader can reopen tasks',
    'Hanya tugas berstatus done yang bisa dibuka kembali':
        'Only completed tasks can be reopened',
}

const unwrap = ({ data, error }) => {
    if (error) throw new Error(ERROR_EN[error.message] || error.message)
    return data
}

const changed = (result) => {
    const data = unwrap(result)
    accountCache.clear()
    return data
}

// ─── AUTH ─────────────────────────────────────────────────────────────────
export const Auth = {
    daftar: (email, password, nama) =>
        supabase.auth.signUp({
            email, password,
            options: { data: { nama } }
        }).then(unwrap),

    masuk: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }).then(unwrap),

    providers: ({ force = false } = {}) => {
        if (force) publicCache.clear()
        return publicCache.read('providers', async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
            headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
        })
        if (!response.ok) throw new Error('Could not load sign-in options')
        return (await response.json()).external || {}
        }, 60000)
    },

    masukGoogle: (redirect = '/dashboard') =>
        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + safeRedirect(redirect),
                queryParams: { prompt: 'select_account' },
            }
        }),

    keluar: () => supabase.auth.signOut().then(unwrap),

    userSaatIni: async () => {
        // Browser UI hint only. Database RLS/RPC still validate the actual JWT.
        // SDK restores/refreshes the session; no repeated remote getUser per query.
        const { data, error } = await supabase.auth.getSession()
        if (error && error.name !== 'AuthSessionMissingError') throw error
        return data.session?.user || null
    },

    profilSaatIni: async () => {
        const user = await Auth.userSaatIni()
        if (!user) return null
        return accountCache.read(`profile:${user.id}`, () => supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(unwrap), 60000)
    },

    updateProfil: async (nama) => {
        const user = await Auth.userSaatIni()
        if (!user) throw new Error('Please sign in first')
        return supabase
            .from('profiles')
            .update({ nama })
            .eq('id', user.id)
            .then(changed)
    },
}

// ─── GRUP ──────────────────────────────────────────────────────────────────
export const Grup = {
    // Daftar semua grup milik user yang login
    daftarSaya: async () => {
        const user = await Auth.userSaatIni()
        if (!user) return []
        return accountCache.read(`groups:${user.id}`, () => supabase
            .from('group_members')
            .select('role, groups(id, nama, kode_undangan, created_at)')
            .eq('user_id', user.id)
            .then(unwrap), 15000)
    },

    // Buat grup baru, user otomatis jadi ketua
    buat: (nama) =>
        supabase.rpc('buat_grup', { nama_grup: nama }).then(changed),

    // Gabung grup lewat kode 6 karakter
    gabung: (kode) =>
        supabase.rpc('gabung_grup', { kode }).then(changed),

    // Keluar dari grup
    keluar: (grupId) =>
        supabase.rpc('keluar_grup', { gid: grupId }).then(changed),

    // Daftar anggota grup beserta role
    anggota: (grupId) =>
        supabase
            .from('group_members')
            .select('role, joined_at, profiles(id, nama, avatar_url)')
            .eq('group_id', grupId)
            .then(unwrap),

    // Ringkasan progres grup
    // return: { total, todo, doing, under_review, done, terlambat, progress_persen }
    ringkasan: (grupId) =>
        supabase.rpc('ringkasan_grup', { gid: grupId }).then(unwrap),

    // Kontribusi per anggota
    // return: [{ anggota_id, nama_anggota, role, tugas_diambil, tugas_selesai, tepat_waktu, persen_kontribusi }]
    kontribusi: (grupId) =>
        supabase.rpc('kontribusi_grup', { gid: grupId }).then(unwrap),
}

// ─── TUGAS (ketua) ─────────────────────────────────────────────────────────
export const TugasKetua = {
    // Tambah tugas draft baru
    tambah: (grupId, { judul, deskripsi = null, deadline = null }) =>
        supabase
            .from('tasks')
            .insert({ group_id: grupId, judul, deskripsi, deadline: deadline || null })
            .select().single().then(changed),

    // Edit tugas (hanya saat masih draft)
    edit: (tugasId, { judul, deskripsi = null, deadline = null }) =>
        supabase
            .from('tasks')
            .update({ judul, deskripsi, deadline: deadline || null })
            .eq('id', tugasId)
            .eq('status', 'draft')
            .select().single().then(changed),

    // Hapus tugas (hanya saat masih draft)
    hapus: (tugasId) =>
        supabase
            .from('tasks')
            .delete()
            .eq('id', tugasId)
            .eq('status', 'draft')
            .then(changed),

    // Kirim semua draft ke anggota
    // return: jumlah tugas yang dikirim
    kirim: (grupId) =>
        supabase.rpc('kirim_tugas', { gid: grupId }).then(changed),

    // Setujui tugas under_review → done
    setujui: (tugasId) =>
        supabase.rpc('setujui_tugas', { tid: tugasId }).then(changed),

    // Tolak tugas under_review → doing + catatan revisi (wajib diisi)
    tolak: (tugasId, catatan) =>
        supabase.rpc('tolak_tugas', { tid: tugasId, catatan }).then(changed),

    // Lepas paksa tugas dari anggota → todo
    lepasPaksa: (tugasId) =>
        supabase.rpc('lepas_paksa', { tid: tugasId }).then(changed),

    // Buka kembali tugas done → doing
    bukaKembali: (tugasId) =>
        supabase.rpc('buka_kembali', { tid: tugasId }).then(changed),
}

// ─── TUGAS (anggota) ───────────────────────────────────────────────────────
export const TugasAnggota = {
    // Ambil tugas todo → doing (klaim untuk diri sendiri)
    ambil: (tugasId) =>
        supabase.rpc('ambil_tugas', { tid: tugasId }).then(changed),

    // Tandai selesai → under_review
    selesaikan: (tugasId) =>
        supabase.rpc('selesaikan_tugas', { tid: tugasId }).then(changed),

    // Lepas tugas sendiri → todo
    lepas: (tugasId) =>
        supabase.rpc('lepas_tugas', { tid: tugasId }).then(changed),
}

// ─── TUGAS (tampilan) ──────────────────────────────────────────────────────
export const Tugas = {
    // Ambil semua tugas terbit grup dari tasks_view (sudah include nama pengerjakan + status_deadline)
    // status_deadline: 'selesai' | 'tanpa_deadline' | 'terlambat' | 'mepet' | 'aman'
    daftar: (grupId) =>
        supabase
            .from('tasks_view')
            .select('*')
            .eq('group_id', grupId)
            .neq('status', 'draft')
            .order('created_at', { ascending: true })
            .then(unwrap),

    // Ambil hanya tugas draft (untuk halaman susun tugas ketua)
    daftarDraft: (grupId) =>
        supabase
            .from('tasks')
            .select('*')
            .eq('group_id', grupId)
            .eq('status', 'draft')
            .order('created_at', { ascending: true })
            .then(unwrap),

    // Ambil tugas milik user yang login (doing atau under_review)
    milikSaya: async (grupId) => {
        const user = await Auth.userSaatIni()
        if (!user) return []
        return supabase
            .from('tasks_view')
            .select('*')
            .eq('group_id', grupId)
            .eq('dikerjakan_oleh', user.id)
            .then(unwrap)
    },

    // Realtime: update otomatis saat tugas berubah
    // Pakai di useEffect, return fungsi untuk berhenti
    pantau: (grupId, callback) => {
        const live = createLiveRefresh(callback)
        const refresh = () => {
            accountCache.clear()
            return live.refresh()
        }
        const ch = supabase
            .channel(`tasks-${grupId}-${++channelId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks',
                filter: `group_id=eq.${grupId}`
            }, refresh)
            // Refresh after the database listener is ready to cover changes during connection.
            .on('system', {}, (payload) => {
                if (payload.status === 'ok') refresh()
            })
            .subscribe()
        const onVisible = () => { if (!document.hidden) refresh() }
        window.addEventListener('focus', refresh)
        window.addEventListener('online', refresh)
        document.addEventListener('visibilitychange', onVisible)
        // Catch up even if the connection was interrupted while the tab was hidden.
        const fallback = window.setInterval(onVisible, 30000)
        live.refresh()
        return () => {
            live.dispose()
            window.clearInterval(fallback)
            window.removeEventListener('focus', refresh)
            window.removeEventListener('online', refresh)
            document.removeEventListener('visibilitychange', onVisible)
            supabase.removeChannel(ch)
        }
    },
}
