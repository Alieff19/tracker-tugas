import { supabase } from './supabase'

const unwrap = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
}

export const Auth = {
    daftar: (email, password, nama) =>
        supabase.auth.signUp({ email, password, options: { data: { nama } } }).then(unwrap),
    masuk: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }).then(unwrap),
    keluar: () => supabase.auth.signOut(),
    userSaatIni: async () => (await supabase.auth.getUser()).data.user,
}

export const Grup = {
    daftarSaya: async () => {
        const user = await Auth.userSaatIni()
        return supabase
            .from('group_members')
            .select('role, groups(id, nama, kode_undangan)')
            .eq('user_id', user.id)
            .then(unwrap)
    },
    buat: (nama) => supabase.rpc('buat_grup', { nama_grup: nama }).then(unwrap),
    gabung: (kode) => supabase.rpc('join_grup', { kode }).then(unwrap),
    keluar: (id) => supabase.rpc('keluar_grup', { gid: id }).then(unwrap),
    hapus: (id) => supabase.rpc('hapus_grup', { gid: id }).then(unwrap),
    anggota: (id) =>
        supabase.from('group_members').select('role, profiles(id, nama)').eq('group_id', id).then(unwrap),
    ringkasan: (id) => supabase.rpc('ringkasan_grup', { gid: id }).then(unwrap),
    kontribusi: (id) => supabase.rpc('kontribusi_grup', { gid: id }).then(unwrap),
}

export const Tugas = {
    daftar: (grupId) =>
        supabase
            .from('tasks_view')
            .select('*')
            .eq('group_id', grupId)
            .order('deadline', { ascending: true, nullsFirst: false })
            .then(unwrap),
    tambah: (grupId, { judul, deskripsi = null, deadline = null, penanggungJawab = null }) =>
        supabase
            .from('tasks')
            .insert({ group_id: grupId, judul, deskripsi, deadline, penanggung_jawab: penanggungJawab })
            .select().single().then(unwrap),
    ubahStatus: (id, status) =>
        supabase.from('tasks').update({ status }).eq('id', id).select().single().then(unwrap),
    ubah: (id, perubahan) =>
        supabase.from('tasks').update(perubahan).eq('id', id).select().single().then(unwrap),
    hapus: (id) => supabase.from('tasks').delete().eq('id', id).then(unwrap),

    // Realtime: return-nya fungsi untuk berhenti mendengarkan
    pantau: (grupId, callback) => {
        const ch = supabase
            .channel(`tasks-${grupId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `group_id=eq.${grupId}` },
                callback)
            .subscribe()
        return () => supabase.removeChannel(ch)
    },
}