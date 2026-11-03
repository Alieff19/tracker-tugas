# Konteks Proyek: KerjaBareng — Tracker Tugas Kelompok

## Ringkasan
Aplikasi web untuk mengelola tugas kelompok mahasiswa. Menggabungkan papan tugas (kanban) dengan laporan kontribusi otomatis per anggota. Pembeda utama dari Trello/Notion: sistem review oleh ketua dan laporan kontribusi terukur yang bisa diekspor sebagai bukti pembagian kerja ke dosen.

---

## Tech Stack
- **Database + Auth + Realtime**: Supabase (PostgreSQL, Row Level Security, Edge Functions)
- **Frontend**: Next.js atau Vite + React
- **Styling**: Tailwind CSS
- **Deploy frontend**: Vercel
- **Login**: Google OAuth + Email-Password (via Supabase Auth)

---

## Peran Pengguna
| Peran | Cara mendapat peran | Hak akses |
|---|---|---|
| **Ketua** | Membuat grup | Buat/edit/hapus tugas, kirim tugas ke anggota, review hasil kerja, lepas paksa tugas, lihat semua data grup |
| **Anggota** | Gabung lewat kode undangan | Ambil tugas, tandai selesai, lepas tugas sendiri, lihat laporan kontribusi |

---

## Alur Lengkap

### 1. Registrasi dan Login
- Login dengan **Google OAuth** (nama diambil dari akun Google, bisa diedit)
- Atau daftar manual dengan **email + password + nama** (nama default = bagian depan email, bisa diedit)
- Profil dibuat otomatis di tabel `profiles` saat pertama kali login/daftar

### 2. Membuat dan Bergabung ke Grup
- Siapa saja bisa membuat grup → pembuatnya otomatis jadi **ketua**
- Setiap grup memiliki:
  - **Link undangan**: `https://domain.com/join/<group_id>`
  - **Kode 6 karakter** (contoh: `92d9c1`)
- Ketua membagikan link ke anggota
- Anggota membuka link → login/daftar → memasukkan kode 6 karakter → masuk grup
- **Minimal 2 anggota, maksimal 5 anggota** (tidak termasuk ketua, atau termasuk ketua — perlu dikonfirmasi saat implementasi)
- Ketua **belum bisa mengirim tugas** sebelum anggota minimal 2

### 3. Menyusun Tugas (Khusus Ketua)
- Ketua membuat tugas 1 sampai N sebagai **draft**
- Tiap tugas berisi:
  - Judul (wajib)
  - Deskripsi (opsional)
  - Deadline (opsional, format `YYYY-MM-DD`)
- Selama masih draft, ketua bisa **menambah, mengedit, dan menghapus** tugas bebas
- Setelah siap, ketua menekan **"Kirim ke anggota"** → muncul **dialog konfirmasi** ("Yakin dengan tugas ini?")
- Setelah dikonfirmasi → semua tugas muncul ke anggota dengan status **To Do**
- Ketua masih bisa menambah tugas baru setelah pengiriman pertama

### 4. Alur Status Tugas
```
[To Do] → [Doing] → [Under Review] → [Done]
                          ↓ (ketua menolak)
                       [Doing] + catatan revisi
```

**Penjelasan tiap transisi:**

| Dari | Ke | Siapa | Cara | Catatan |
|---|---|---|---|---|
| To Do | Doing | Anggota | Klik "Saya kerjakan" | Tugas terkunci untuk anggota ini. Anggota lain tidak bisa mengambil tugas yang sama |
| Doing | Under Review | Anggota | Klik "Tandai selesai" / centang | Anggota menyatakan pekerjaannya selesai |
| Under Review | Done | Ketua | Klik "Setujui" | Kontribusi anggota tercatat. Tugas dikunci |
| Under Review | Doing | Ketua | Klik "Tolak" + isi catatan revisi | Tugas kembali ke Doing, catatan revisi tampil ke anggota. Anggota memperbaiki lalu mencentang lagi |
| Doing | To Do | Anggota sendiri | Klik "Lepas tugas" | Anggota melepas tugasnya, tugas kembali ke To Do dan bisa diambil siapa saja |
| Doing | To Do | Ketua | Klik "Lepas paksa" | Ketua melepas tugas dari anggota yang tidak aktif. Tugas kembali ke To Do |

**Aturan tambahan:**
- Tugas berstatus **Done dikunci** (tidak bisa diedit atau diubah statusnya), kecuali ketua menekan "Buka kembali" → tugas kembali ke Doing dengan pemilik yang sama
- Tugas hanya bisa diambil jika statusnya **To Do** (tidak ada pemilik)
- Satu tugas = satu pemilik (satu orang yang mengerjakan)

### 5. Perhitungan Kontribusi
- **Nilai per tugas** = 100 ÷ total tugas yang diterbitkan ketua
- **Kontribusi anggota** = jumlah tugas Done miliknya × nilai per tugas
- Rumus: `kontribusi_persen = (tugas_done_milik_anggota / total_tugas) × 100`
- Contoh: 10 tugas diterbitkan, A menyelesaikan 4 tugas → kontribusi A = 40%
- Laporan kontribusi bisa dilihat **semua anggota**

### 6. Laporan Kontribusi
Menampilkan per anggota:
- Nama anggota
- Jumlah tugas yang diambil
- Jumlah tugas selesai (Done)
- Persentase kontribusi
- Jumlah tugas yang selesai tepat waktu (sebelum atau pada deadline)

---

## Desain Database (Supabase PostgreSQL)

### Tabel: `profiles`
Dibuat otomatis saat user pertama kali login.
```
id            uuid  PRIMARY KEY (references auth.users)
nama          text  NOT NULL
avatar_url    text  (dari Google, opsional)
created_at    timestamptz  DEFAULT now()
```

### Tabel: `groups`
```
id              uuid  PRIMARY KEY DEFAULT gen_random_uuid()
nama            text  NOT NULL
kode_undangan   text  UNIQUE NOT NULL DEFAULT 6 karakter acak
dibuat_oleh     uuid  REFERENCES profiles(id)
jumlah_anggota  int   DEFAULT 0 (atau hitung dari group_members)
created_at      timestamptz  DEFAULT now()
```

### Tabel: `group_members`
```
group_id    uuid  REFERENCES groups(id) ON DELETE CASCADE
user_id     uuid  REFERENCES profiles(id) ON DELETE CASCADE
role        text  DEFAULT 'member' — nilai: 'ketua' | 'member'
joined_at   timestamptz  DEFAULT now()
PRIMARY KEY (group_id, user_id)
```

### Tabel: `tasks`
```
id              uuid  PRIMARY KEY DEFAULT gen_random_uuid()
group_id        uuid  REFERENCES groups(id) ON DELETE CASCADE
judul           text  NOT NULL
deskripsi       text
deadline        date
status          text  DEFAULT 'draft'
                      nilai: 'draft' | 'todo' | 'doing' | 'under_review' | 'done'
dikerjakan_oleh uuid  REFERENCES profiles(id) — pemilik saat ini (null jika todo/draft)
catatan_revisi  text  — diisi ketua saat menolak
diterbitkan_at  timestamptz  — diisi saat ketua kirim ke anggota
diambil_at      timestamptz  — diisi saat anggota klik "Saya kerjakan"
selesai_at      timestamptz  — diisi saat status jadi done
dikunci         boolean  DEFAULT false  — true jika done
created_at      timestamptz  DEFAULT now()
```

### Tabel: `task_history` (opsional, untuk audit log)
```
id          uuid  PRIMARY KEY DEFAULT gen_random_uuid()
task_id     uuid  REFERENCES tasks(id) ON DELETE CASCADE
user_id     uuid  REFERENCES profiles(id)
aksi        text  — 'ambil' | 'selesai' | 'disetujui' | 'ditolak' | 'dilepas' | 'lepas_paksa'
catatan     text
created_at  timestamptz  DEFAULT now()
```

---

## Fungsi SQL (RPC) yang Dibutuhkan
Semua dipanggil via `supabase.rpc(...)` dari frontend.

| Nama fungsi | Parameter | Aksi |
|---|---|---|
| `buat_grup(nama_grup)` | nama: text | Buat grup baru, tambah pembuatnya sebagai ketua |
| `gabung_grup(kode)` | kode: text | Validasi kode, tambah user sebagai anggota |
| `kirim_tugas(group_id)` | gid: uuid | Ubah semua draft milik grup menjadi todo |
| `ambil_tugas(task_id)` | tid: uuid | Ubah status todo → doing, isi dikerjakan_oleh |
| `selesaikan_tugas(task_id)` | tid: uuid | Ubah status doing → under_review |
| `setujui_tugas(task_id)` | tid: uuid | Ubah status under_review → done, kunci tugas (ketua saja) |
| `tolak_tugas(task_id, catatan)` | tid: uuid, catatan: text | Ubah status under_review → doing, isi catatan_revisi (ketua saja) |
| `lepas_tugas(task_id)` | tid: uuid | Anggota melepas tugasnya → doing ke todo |
| `lepas_paksa(task_id)` | tid: uuid | Ketua melepas tugas dari anggota → doing ke todo (ketua saja) |
| `buka_kembali(task_id)` | tid: uuid | Ketua membuka tugas done → doing, buka kunci |
| `kontribusi_grup(group_id)` | gid: uuid | Hitung persentase kontribusi tiap anggota |
| `ringkasan_grup(group_id)` | gid: uuid | Hitung total, todo, doing, under_review, done, terlambat |

---

## Row Level Security (RLS)

### Prinsip utama
- User hanya bisa mengakses data grup tempat dia menjadi anggota
- Fungsi SQL memakai `security definer` sehingga logika aturan ada di database, bukan di frontend
- Anon key aman dipakai di frontend selama RLS aktif di semua tabel

### Ringkasan policy
| Tabel | Select | Insert | Update | Delete |
|---|---|---|---|---|
| profiles | Semua user login | Otomatis via trigger | Pemilik saja | - |
| groups | Anggota grup | Via fungsi `buat_grup` | Ketua saja | Via fungsi `hapus_grup` |
| group_members | Sesama anggota | Via fungsi `gabung_grup` | - | Diri sendiri (keluar) |
| tasks | Anggota grup | Ketua saja | Via fungsi RPC | Ketua saja (saat draft) |

---

## Halaman Aplikasi dan Fungsi yang Dipanggil

| Halaman | URL | Fungsi dipanggil |
|---|---|---|
| Login / Daftar | `/login` | `Auth.masuk`, `Auth.daftar`, `Auth.loginGoogle` |
| Dashboard | `/dashboard` | `Grup.daftarSaya()` |
| Buat grup | `/dashboard` (modal) | `buat_grup(nama)` |
| Gabung grup | `/join/[group_id]` | `gabung_grup(kode)` |
| Detail grup: kanban | `/grup/[id]` | `Tugas.daftar(id)`, `ringkasan_grup(id)`, realtime |
| Detail grup: daftar anggota | `/grup/[id]/anggota` | `Grup.anggota(id)` |
| Susun tugas (draft) | `/grup/[id]/susun` | CRUD tugas draft, `kirim_tugas(id)` |
| Kontribusi | `/grup/[id]/kontribusi` | `kontribusi_grup(id)` |
| Ambil tugas | Tombol di kanban | `ambil_tugas(task_id)` |
| Tandai selesai | Tombol di kanban | `selesaikan_tugas(task_id)` |
| Review tugas | Modal di kanban (ketua) | `setujui_tugas`, `tolak_tugas` |
| Lepas tugas | Tombol di kanban | `lepas_tugas`, `lepas_paksa` |

---

## Status Tugas dan Tampilan UI

| Status | Label di UI | Warna | Tombol tersedia |
|---|---|---|---|
| `draft` | Draft | Abu-abu | Edit, Hapus (ketua) |
| `todo` | Tersedia | Biru muda | "Saya kerjakan" (anggota) |
| `doing` | Sedang dikerjakan | Kuning/oranye | "Tandai selesai" (pemilik), "Lepas" (pemilik), "Lepas paksa" (ketua) |
| `under_review` | Menunggu review | Ungu | "Setujui", "Tolak + catatan" (ketua) |
| `done` | Selesai | Hijau | "Buka kembali" (ketua, opsional) |

### Penanda deadline (dari kolom `deadline`)
| Kondisi | Label | Warna |
|---|---|---|
| Status done | Selesai | Hijau tua |
| Tidak ada deadline | Tanpa deadline | Abu-abu |
| Deadline sudah lewat, belum done | Terlambat | Merah |
| Deadline dalam 2 hari, belum done | Mepet | Oranye |
| Deadline masih jauh | Aman | Hijau muda |

---

## Realtime
Aktifkan Supabase Realtime untuk tabel `tasks`. Papan kanban update otomatis saat anggota lain mengambil, menyelesaikan, atau melepas tugas.

```js
supabase
  .channel(`tasks-${grupId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'tasks', filter: `group_id=eq.${grupId}` },
    () => muatUlangTugas())
  .subscribe()
```

---

## Aturan Bisnis Penting
1. Tugas hanya bisa diambil jika statusnya `todo` dan `dikerjakan_oleh` adalah null
2. Hanya pemilik tugas (atau ketua) yang bisa mengubah status dari `doing`
3. Hanya ketua yang bisa mereview (`under_review → done` atau `under_review → doing`)
4. Tugas berstatus `done` dan `dikunci = true` tidak bisa diedit kecuali ketua membuka kembali
5. Ketua baru bisa memanggil `kirim_tugas` jika jumlah anggota ≥ 2
6. Jumlah anggota maksimal 5, termasuk ketua
7. Catatan revisi harus diisi saat menolak tugas
8. Kontribusi hanya dihitung dari tugas berstatus `done`
9. Nilai per tugas dihitung dari total tugas yang sudah diterbitkan (`status != 'draft'`)

---

## Yang Belum Diputuskan (perlu dikonfirmasi)
- [ ] Apakah "minimal 2, maksimal 5" termasuk ketua atau tidak?
- [ ] Apakah tugas Done benar-benar dikunci permanen, atau ketua bisa membuka kembali?
- [ ] Apakah login Google wajib atau opsional (sebagai alternatif email-password)?
- [ ] Ekspor laporan kontribusi ke PDF: ada atau tidak?

---

## File dan Struktur Repo
```
repo/
├── .env.example
├── .gitignore              (.env.local wajib ada di sini)
├── README.md
├── docs/
│   ├── CONTEXT.md          (file ini)
│   └── backend.md          (panduan untuk frontend)
├── database/
│   └── schema.sql          (semua SQL: tabel, RLS, fungsi)
└── lib/
    ├── supabase.js         (inisialisasi client)
    └── api.js              (semua fungsi yang dipanggil frontend)
```

---

## Catatan untuk AI Agent
- **Jangan membuat query langsung ke tabel dari frontend.** Semua logika bisnis ada di fungsi SQL (`supabase.rpc(...)`).
- **Jangan memakai `service_role` key di frontend.** Gunakan `publishable key` / `anon key`.
- **RLS harus aktif di semua tabel.** Tanpa RLS, anon key bisa membaca semua data.
- **Nama variabel environment:** `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Untuk Vite, ganti `NEXT_PUBLIC_` dengan `VITE_` dan `process.env` dengan `import.meta.env`.
- **Format deadline:** selalu kirim sebagai `'YYYY-MM-DD'` atau `null`. Jangan pernah kirim string kosong.
- **Realtime:** aktifkan di tabel `tasks` via `supabase_realtime` publication.
- **Status tugas hanya boleh:** `draft`, `todo`, `doing`, `under_review`, `done`. Tidak ada nilai lain.
