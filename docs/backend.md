# Panduan Backend untuk Frontend

Backend memakai **Supabase** (Auth + PostgreSQL + RLS). Frontend tidak perlu
membuat query sendiri: semua logika dipanggil lewat `lib/api.js`.

---

## Setup

1. `npm install @supabase/supabase-js`
2. Salin `.env.example` menjadi `.env.local`, lalu isi:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zccrhyyyjeobxjjuuxrz.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Z47vw5Dyx2kTUZgDkwcu_w_VG602K-k
   ```
3. Untuk Vite: ganti `NEXT_PUBLIC_` dengan `VITE_` dan `process.env` dengan `import.meta.env` di `lib/supabase.js`.
4. Jangan pernah memakai secret key (`sb_secret_...`) di frontend atau di repo.

---

## Struktur `lib/api.js`

Fungsi dibagi 5 kelompok. Import sesuai kebutuhan halaman:

```js
import { Auth, Grup, Tugas, TugasKetua, TugasAnggota } from '@/lib/api'
```

| Kelompok | Siapa yang pakai |
|---|---|
| `Auth` | Semua halaman |
| `Grup` | Semua halaman yang ada grup |
| `Tugas` | Semua anggota (baca + realtime) |
| `TugasKetua` | Komponen khusus role `ketua` |
| `TugasAnggota` | Komponen khusus role `member` |

---

## Peta halaman ke fungsi

### Halaman Login / Daftar (`/login`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Daftar email | `Auth.daftar(email, pw, nama)` | User baru, profil dibuat otomatis |
| Login email | `Auth.masuk(email, pw)` | Sesi login |
| Login Google | `Auth.masukGoogle()` | Redirect ke Google, lalu kembali ke `/dashboard` |
| Logout | `Auth.keluar()` | Sesi dihapus |
| Ambil user aktif | `Auth.userSaatIni()` | Objek user atau null |
| Ambil profil aktif | `Auth.profilSaatIni()` | `{ id, nama, avatar_url }` |
| Ganti nama | `Auth.updateProfil(nama)` | - |

### Halaman Dashboard (`/dashboard`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Daftar grup saya | `Grup.daftarSaya()` | `[{ role, groups: { id, nama, kode_undangan } }]` |
| Buat grup | `Grup.buat(nama)` | Objek grup baru |
| Gabung grup | `Grup.gabung(kode)` | Objek grup |

### Halaman Gabung (`/join/[group_id]`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Gabung lewat kode | `Grup.gabung(kode)` | Objek grup |

### Halaman Detail Grup — Kanban (`/grup/[id]`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Ambil semua tugas | `Tugas.daftar(grupId)` | List tugas + `status_deadline` |
| Ringkasan progres | `Grup.ringkasan(grupId)` | `{ total, todo, doing, under_review, done, terlambat, progress_persen }` |
| Update otomatis | `Tugas.pantau(grupId, callback)` | Fungsi untuk berhenti |
| Tugas milik saya | `Tugas.milikSaya(grupId)` | List tugas yang sedang dikerjakan user |
| Ambil tugas | `TugasAnggota.ambil(tugasId)` | Tugas terbaru |
| Tandai selesai | `TugasAnggota.selesaikan(tugasId)` | Tugas terbaru |
| Lepas tugas | `TugasAnggota.lepas(tugasId)` | Tugas terbaru |
| Setujui tugas | `TugasKetua.setujui(tugasId)` | Tugas terbaru |
| Tolak tugas | `TugasKetua.tolak(tugasId, catatan)` | Tugas terbaru |
| Lepas paksa | `TugasKetua.lepasPaksa(tugasId)` | Tugas terbaru |
| Buka kembali done | `TugasKetua.bukaKembali(tugasId)` | Tugas terbaru |

### Halaman Susun Tugas — Ketua (`/grup/[id]/susun`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Lihat draft | `Tugas.daftarDraft(grupId)` | List tugas draft |
| Tambah tugas | `TugasKetua.tambah(grupId, { judul, deskripsi, deadline })` | Tugas baru |
| Edit tugas | `TugasKetua.edit(tugasId, { judul, deskripsi, deadline })` | Tugas terbaru |
| Hapus tugas | `TugasKetua.hapus(tugasId)` | - |
| Kirim ke anggota | `TugasKetua.kirim(grupId)` | Jumlah tugas yang dikirim |

### Halaman Anggota (`/grup/[id]/anggota`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Daftar anggota | `Grup.anggota(grupId)` | `[{ role, profiles: { id, nama, avatar_url } }]` |
| Keluar grup | `Grup.keluar(grupId)` | - |

### Halaman Kontribusi (`/grup/[id]/kontribusi`)
| Aksi | Fungsi | Hasil |
|---|---|---|
| Kontribusi anggota | `Grup.kontribusi(grupId)` | `[{ anggota_id, nama_anggota, role, tugas_diambil, tugas_selesai, tepat_waktu, persen_kontribusi }]` |

---

## Bentuk data tugas (dari `Tugas.daftar`)

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | ID tugas |
| `group_id` | uuid | ID grup |
| `judul` | text | Judul tugas |
| `deskripsi` | text / null | Deskripsi opsional |
| `deadline` | date / null | Format `YYYY-MM-DD` |
| `status` | text | Lihat tabel status di bawah |
| `dikerjakan_oleh` | uuid / null | ID anggota yang mengambil tugas |
| `nama_pengerjakan` | text / null | Nama anggota (siap ditampilkan) |
| `avatar_pengerjakan` | text / null | URL avatar anggota |
| `catatan_revisi` | text / null | Diisi ketua saat menolak |
| `status_deadline` | text | Lihat tabel penanda deadline |
| `dikunci` | boolean | true jika tugas done dan dikunci |
| `diterbitkan_at` | timestamptz | Waktu dikirim ke anggota |
| `diambil_at` | timestamptz | Waktu diambil anggota |
| `selesai_at` | timestamptz | Waktu disetujui ketua |

---

## Status tugas

| Status | Label UI | Tombol yang tampil |
|---|---|---|
| `draft` | Draft | Edit, Hapus (ketua) |
| `todo` | Tersedia | "Saya kerjakan" (anggota) |
| `doing` | Sedang dikerjakan | "Tandai selesai" + "Lepas" (pemilik), "Lepas paksa" (ketua) |
| `under_review` | Menunggu review | "Setujui" + "Tolak" (ketua) |
| `done` | Selesai ✓ | "Buka kembali" (ketua, opsional) |

**Aturan tombol:**
- Tombol `TugasKetua.*` hanya tampilkan jika `role === 'ketua'`
- Tombol `TugasAnggota.*` hanya tampilkan jika `role === 'member'` atau `role === 'ketua'` (ketua juga boleh mengerjakan tugas)
- Tombol "Lepas" dan "Tandai selesai" hanya tampilkan jika `dikerjakan_oleh === user.id`

---

## Penanda deadline (`status_deadline`)

| Nilai | Arti | Saran warna |
|---|---|---|
| `selesai` | Tugas done | Hijau tua |
| `tanpa_deadline` | Tidak ada deadline | Abu-abu |
| `terlambat` | Lewat deadline, belum done | Merah |
| `mepet` | Deadline dalam 2 hari | Oranye |
| `aman` | Deadline masih jauh | Hijau muda |

---

## Aturan penting untuk UI

1. **`deadline`** dikirim sebagai `'YYYY-MM-DD'` atau `null`. Jangan pernah kirim string kosong.
2. **Halaman susun tugas** hanya bisa diakses ketua. Sembunyikan dari anggota.
3. **Tombol "Kirim ke anggota"** tampilkan dialog konfirmasi sebelum memanggil `TugasKetua.kirim()`.
4. **Tombol "Tolak"** wajib meminta input catatan revisi. Kirim hanya jika catatan tidak kosong.
5. **Tugas `dikunci = true`** tidak bisa diedit. Sembunyikan tombol edit.
6. **Kode undangan** 6 karakter ada di `groups.kode_undangan`. Tampilkan di halaman grup agar mudah dibagikan.
7. **Role** diambil dari `Grup.daftarSaya()` atau `Grup.anggota()`. Simpan di state/context supaya tidak perlu fetch ulang tiap render.

---

## Contoh pemakaian

### Halaman kanban dengan realtime
```js
const [tugas, setTugas] = useState([])
const [ringkasan, setRingkasan] = useState(null)

useEffect(() => {
  const muat = async () => {
    setTugas(await Tugas.daftar(grupId))
    setRingkasan(await Grup.ringkasan(grupId))
  }
  muat()
  return Tugas.pantau(grupId, muat) // update otomatis
}, [grupId])
```

### Anggota ambil tugas
```js
const handleAmbil = async (tugasId) => {
  try {
    await TugasAnggota.ambil(tugasId)
    // UI update otomatis lewat realtime
  } catch (e) {
    toast.error(e.message)
    // Contoh pesan: "Tugas ini tidak bisa diambil"
  }
}
```

### Ketua kirim tugas ke anggota
```js
const handleKirim = async () => {
  const konfirmasi = window.confirm('Yakin dengan tugas yang sudah dibuat?')
  if (!konfirmasi) return
  try {
    const jumlah = await TugasKetua.kirim(grupId)
    toast.success(`${jumlah} tugas berhasil dikirim`)
    router.push(`/grup/${grupId}`) // arahkan ke kanban
  } catch (e) {
    toast.error(e.message)
    // Contoh pesan: "Minimal 2 anggota sebelum tugas bisa dikirim"
  }
}
```

### Ketua tolak tugas
```js
const handleTolak = async (tugasId) => {
  const catatan = prompt('Tuliskan catatan revisi:')
  if (!catatan || catatan.trim() === '') return
  try {
    await TugasKetua.tolak(tugasId, catatan)
  } catch (e) {
    toast.error(e.message)
  }
}
```

### Cek role user di halaman grup
```js
const [role, setRole] = useState(null)

useEffect(() => {
  const cekRole = async () => {
    const user = await Auth.userSaatIni()
    const anggota = await Grup.anggota(grupId)
    const saya = anggota.find(a => a.profiles.id === user.id)
    setRole(saya?.role ?? 'member')
  }
  cekRole()
}, [grupId])

// Di JSX:
{role === 'ketua' && <TombolSetujui />}
```

---

## Penanganan error

Semua fungsi melempar `Error` dengan pesan berbahasa Indonesia:

```js
try {
  await TugasAnggota.ambil(tugasId)
} catch (e) {
  toast.error(e.message)
}
```

| Pesan | Penyebab |
|---|---|
| Harus login dulu | User belum login |
| Kode undangan tidak valid | Kode salah |
| Kamu sudah anggota grup ini | Mencoba gabung dua kali |
| Grup sudah penuh (maksimal 5 anggota) | Anggota sudah 5 |
| Nama grup minimal 3 karakter | Nama terlalu pendek |
| Tugas ini tidak bisa diambil | Status bukan todo |
| Kamu bukan pemilik tugas ini | Mencoba selesaikan/lepas tugas orang lain |
| Hanya ketua yang bisa menyetujui tugas | Anggota mencoba setujui |
| Catatan revisi wajib diisi saat menolak tugas | Catatan kosong saat tolak |
| Minimal 2 anggota sebelum tugas bisa dikirim | Grup belum cukup anggota |
| Tidak ada tugas draft untuk dikirim | Belum ada draft |

---

## Keamanan

- Data dilindungi Row Level Security: user hanya bisa mengakses data grup miliknya.
- Semua logika bisnis ada di fungsi SQL (`supabase.rpc`), bukan di frontend.
- Anon/publishable key aman di frontend selama RLS aktif.
- Jangan taruh `service_role` / `secret key` di frontend atau repo.

---

## Akun demo

| Email | Password | Role di grup demo |
|---|---|---|
| a@test.com | (12345678) | Ketua |
| b@test.com | (12345678) | Anggota |
| c@test.com | (12345678) | Di luar grup (untuk tes RLS) |