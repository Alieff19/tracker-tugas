# Panduan Backend (untuk Frontend)

Backend memakai **Supabase** (Auth + PostgreSQL + RLS). Frontend tidak perlu
membuat query sendiri: semua logika dipanggil lewat `lib/api.js`.

## Setup
1. `npm install @supabase/supabase-js`
2. Salin `.env.example` menjadi `.env.local`, lalu isi:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable key (`sb_publishable_...`)
3. Jangan pernah memakai secret key di frontend atau di repo.

## Peta halaman ke fungsi

| Halaman | Fungsi | Hasil |
|---|---|---|
| Daftar | `Auth.daftar(email, pw, nama)` | user baru, profil dibuat otomatis |
| Login | `Auth.masuk(email, pw)` | sesi login |
| Dashboard | `Grup.daftarSaya()` | `[{ role, groups: { id, nama, kode_undangan } }]` |
| Buat grup | `Grup.buat(nama)` | objek grup |
| Gabung grup | `Grup.gabung(kode)` | objek grup |
| Papan kanban | `Tugas.daftar(grupId)` | list tugas + `status_deadline` |
| Daftar anggota | `Grup.anggota(grupId)` | `[{ role, profiles: { id, nama } }]` |
| Kartu ringkasan | `Grup.ringkasan(grupId)` | `{ total, todo, doing, done, terlambat, progress_persen }` |
| Halaman kontribusi | `Grup.kontribusi(grupId)` | list anggota + `persen_kontribusi` |
| Tambah tugas | `Tugas.tambah(grupId, { judul, deskripsi, deadline, penanggungJawab })` | tugas baru |
| Ubah tugas | `Tugas.ubah(id, { judul, deadline, penanggung_jawab })` | tugas terbaru |
| Geser kanban | `Tugas.ubahStatus(id, 'doing')` | tugas terbaru |
| Hapus tugas | `Tugas.hapus(id)` | - |
| Keluar / hapus grup | `Grup.keluar(id)` / `Grup.hapus(id)` | - |

## Nilai yang harus dipatuhi UI
- `status`: `'todo' | 'doing' | 'done'`
- `status_deadline`: `'selesai' | 'tanpa_deadline' | 'terlambat' | 'mepet' | 'aman'`
  - saran warna: terlambat = merah, mepet = oranye, aman = abu/hijau muda, selesai = hijau
- `deadline`: format `'YYYY-MM-DD'`, atau `null` jika kosong (jangan string kosong)
- `penanggungJawab`: isi dengan `profiles.id` dari `Grup.anggota`
- Kode undangan grup ada di `groups.kode_undangan` (6 karakter), tampilkan di halaman grup agar bisa dibagikan.
- Hanya admin yang bisa menghapus grup (UI boleh menyembunyikan tombolnya untuk role `member`).

## Contoh: halaman detail grup (realtime)
```js
useEffect(() => {
  const muat = async () => {
    setTugas(await Tugas.daftar(grupId))
    setRingkasan(await Grup.ringkasan(grupId))
  }
  muat()
  return Tugas.pantau(grupId, muat) // update otomatis saat anggota lain mengubah tugas
}, [grupId])
```

## Error handling
Semua fungsi melempar `Error` dengan pesan berbahasa Indonesia:
```js
try { await Grup.gabung(kode) } catch (e) { toast.error(e.message) }
```
Contoh pesan: "Kode undangan tidak valid", "Penanggung jawab harus anggota grup",
"Hanya admin yang bisa menghapus grup".

## Keamanan
Data dilindungi Row Level Security: user hanya bisa membaca dan mengubah data
grup tempat dia menjadi anggota.