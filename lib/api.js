import { supabase } from './supabase'

const unwrap = ({ data, error }) => {
    if (error) throw new Error(error.message)
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

    masukGoogle: () =>
        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/dashboard' }
        }),

    keluar: () => supabase.auth.signOut(),

    userSaatIni: async () => (await supabase.auth.getUser()).data.user,

    profilSaatIni: async () => {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return null
        return supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(unwrap)
    },

    updateProfil: (nama) =>
        supabase.auth.getUser().then(async ({ data }) =>
            supabase
                .from('profiles')
                .update({ nama })
                .eq('id', data.user.id)
                .then(unwrap)
        ),
}

// ─── GRUP ──────────────────────────────────────────────────────────────────
export const Grup = {
    // Daftar semua grup milik user yang login
    daftarSaya: async () => {
        const user = await Auth.userSaatIni()
        return supabase
            .from('group_members')
            .select('role, groups(id, nama, kode_undangan, created_at)')
            .eq('user_id', user.id)
            .then(unwrap)
    },

    // Buat grup baru, user otomatis jadi ketua
    buat: (nama) =>
        supabase.rpc('buat_grup', { nama_grup: nama }).then(unwrap),

    // Gabung grup lewat kode 6 karakter
    gabung: (kode) =>
        supabase.rpc('gabung_grup', { kode }).then(unwrap),

    // Keluar dari grup
    keluar: (grupId) =>
        supabase.rpc('keluar_grup', { gid: grupId }).then(unwrap),

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
            .insert({ group_id: grupId, judul, deskripsi, deadline })
            .select().single().then(unwrap),

    // Edit tugas (hanya saat masih draft)
    edit: (tugasId, { judul, deskripsi = null, deadline = null }) =>
        supabase
            .from('tasks')
            .update({ judul, deskripsi, deadline })
            .eq('id', tugasId)
            .eq('status', 'draft')
            .select().single().then(unwrap),

    // Hapus tugas (hanya saat masih draft)
    hapus: (tugasId) =>
        supabase
            .from('tasks')
            .delete()
            .eq('id', tugasId)
            .eq('status', 'draft')
            .then(unwrap),

    // Kirim semua draft ke anggota
    // return: jumlah tugas yang dikirim
    kirim: (grupId) =>
        supabase.rpc('kirim_tugas', { gid: grupId }).then(unwrap),

    // Setujui tugas under_review → done
    setujui: (tugasId) =>
        supabase.rpc('setujui_tugas', { tid: tugasId }).then(unwrap),

    // Tolak tugas under_review → doing + catatan revisi (wajib diisi)
    tolak: (tugasId, catatan) =>
        supabase.rpc('tolak_tugas', { tid: tugasId, catatan }).then(unwrap),

    // Lepas paksa tugas dari anggota → todo
    lepasPaksa: (tugasId) =>
        supabase.rpc('lepas_paksa', { tid: tugasId }).then(unwrap),

    // Buka kembali tugas done → doing
    bukaKembali: (tugasId) =>
        supabase.rpc('buka_kembali', { tid: tugasId }).then(unwrap),
}

// ─── TUGAS (anggota) ───────────────────────────────────────────────────────
export const TugasAnggota = {
    // Ambil tugas todo → doing (klaim untuk diri sendiri)
    ambil: (tugasId) =>
        supabase.rpc('ambil_tugas', { tid: tugasId }).then(unwrap),

    // Tandai selesai → under_review
    selesaikan: (tugasId) =>
        supabase.rpc('selesaikan_tugas', { tid: tugasId }).then(unwrap),

    // Lepas tugas sendiri → todo
    lepas: (tugasId) =>
        supabase.rpc('lepas_tugas', { tid: tugasId }).then(unwrap),
}

// ─── TUGAS (tampilan) ──────────────────────────────────────────────────────
export const Tugas = {
    // Ambil semua tugas grup dari tasks_view (sudah include nama pengerjakan + status_deadline)
    // status_deadline: 'selesai' | 'tanpa_deadline' | 'terlambat' | 'mepet' | 'aman'
    daftar: (grupId) =>
        supabase
            .from('tasks_view')
            .select('*')
            .eq('group_id', grupId)
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
        const ch = supabase
            .channel(`tasks-${grupId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks',
                filter: `group_id=eq.${grupId}`
            }, callback)
            .subscribe()
        return () => supabase.removeChannel(ch)
    },
}