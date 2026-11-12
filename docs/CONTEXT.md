# Gotaks — Konteks Bisnis & Spesifikasi Sistem

**Tagline:** *"Kerja kelompok yang jelas, adil, dan terukur."*

Dokumen ini merupakan acuan utama pengembangan aplikasi web Gotaks, yaitu aplikasi pengelolaan tugas kelompok mahasiswa yang menggabungkan Kanban Task Management, sistem review oleh ketua, dan laporan kontribusi otomatis setiap anggota.

---

# 1. Konteks Bisnis

## 1.1 Latar Belakang

Dalam pengerjaan tugas kelompok mahasiswa, pembagian pekerjaan dan pemantauan kontribusi setiap anggota sering kali tidak terdokumentasi dengan baik. Aplikasi pengelola tugas umum seperti Trello atau Notion dapat membantu mengatur pekerjaan, tetapi belum tentu menyediakan mekanisme validasi hasil kerja oleh ketua dan laporan kontribusi terukur yang sesuai dengan kebutuhan akademik.

Gotaks dikembangkan untuk membantu kelompok mahasiswa mengelola pekerjaan secara transparan, terstruktur, dan adil.

Gotaks menyediakan:
- Pengelolaan tugas kelompok melalui papan Kanban.
- Pembagian tugas berdasarkan pengambilan tugas oleh anggota.
- Mekanisme review dan persetujuan tugas oleh ketua.
- Catatan revisi apabila hasil pekerjaan ditolak.
- Perhitungan kontribusi otomatis berdasarkan tugas yang diselesaikan.
- Riwayat aktivitas pengerjaan tugas.
- Laporan kontribusi yang dapat digunakan sebagai bukti pembagian kerja kepada dosen.

## 1.2 Tujuan Sistem

1. Mempermudah ketua dalam membentuk kelompok dan mengelola tugas.
2. Memudahkan anggota mengambil dan menyelesaikan tugas.
3. Memastikan hasil pekerjaan direview oleh ketua sebelum dinyatakan selesai.
4. Mengukur kontribusi anggota secara objektif berdasarkan tugas yang disetujui.
5. Meningkatkan transparansi pembagian pekerjaan.
6. Menyediakan dokumentasi aktivitas dan laporan kontribusi kelompok.

## 1.3 Nilai Pembeda

Pembeda utama Gotaks dibandingkan aplikasi pengelola tugas umum adalah integrasi tiga fitur utama:

- **Task Management:** Pengelolaan tugas menggunakan Kanban.
- **Task Review:** Validasi hasil pekerjaan oleh ketua kelompok.
- **Contribution Tracking:** Penghitungan kontribusi otomatis berdasarkan tugas berstatus Done.

Gotaks tidak hanya menunjukkan siapa yang sedang mengerjakan tugas, tetapi juga mencatat pekerjaan yang benar-benar telah diselesaikan dan disetujui.

---

# 2. Teknologi dan Arsitektur Sistem

## 2.1 Tech Stack

| Komponen | Teknologi |
|---|---|
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Row Level Security (RLS) |
| Backend Logic | PostgreSQL Functions / RPC |
| Realtime | Supabase Realtime |
| Edge Processing | Supabase Edge Functions jika diperlukan |
| Frontend | Next.js atau Vite + React |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| Login | Google OAuth dan Email-Password |

## 2.2 Prinsip Arsitektur

- Supabase PostgreSQL menjadi sumber kebenaran utama (*single source of truth*).
- Seluruh logika bisnis dijalankan di database melalui fungsi RPC.
- Frontend memanggil fungsi menggunakan `supabase.rpc(...)`.
- Frontend tidak melakukan query langsung ke tabel untuk operasi bisnis.
- RLS wajib aktif pada seluruh tabel yang dapat diakses melalui API.
- Frontend hanya menggunakan publishable key atau anon key.
- `service_role` key tidak boleh digunakan di frontend.
- Setiap fungsi `SECURITY DEFINER` wajib menggunakan `search_path` yang aman.
- Setiap fungsi wajib memvalidasi identitas, keanggotaan, role, dan hak akses pengguna.
- Perubahan data tugas disinkronkan menggunakan Supabase Realtime.

## 2.3 Environment Variables

Untuk Next.js:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Untuk Vite:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Ketentuan:
- Simpan konfigurasi lokal di `.env.local`.
- Pastikan `.env.local` masuk ke `.gitignore`.
- Jangan pernah memasukkan secret key ke repository.
- Jangan pernah menggunakan `service_role` key pada frontend.

---

# 3. Peran dan Hak Akses Pengguna

Gotaks memiliki dua jenis pengguna.

| Peran | Cara Memperoleh Peran | Hak Akses |
|---|---|---|
| Ketua | Otomatis ketika membuat grup | Membuat, mengedit, dan menghapus tugas draft; menerbitkan tugas; melihat seluruh data grup; melakukan review; melepas tugas secara paksa; membuka kembali tugas Done |
| Anggota | Bergabung menggunakan kode undangan | Melihat tugas; mengambil tugas; menandai tugas selesai; melepas tugas sendiri; melihat laporan kontribusi |

Ketua juga terdaftar sebagai anggota grup.

Seluruh akses data harus dibatasi berdasarkan keanggotaan pengguna pada grup terkait.

---

# 4. Kebutuhan Fungsional dan Alur Sistem

## 4.1 Registrasi dan Login

Gotaks menyediakan dua metode autentikasi:

### A. Google OAuth
- Pengguna dapat login menggunakan akun Google.
- Nama diambil dari akun Google.
- Avatar dapat diambil dari akun Google.
- Nama profil dapat diedit.

### B. Email dan Password
- Pengguna dapat mendaftar menggunakan email, password, dan nama.
- Nama default dapat diambil dari bagian depan alamat email.
- Nama profil dapat diedit.

Profil pengguna dibuat secara otomatis pada tabel `profiles` ketika pengguna pertama kali terdaftar melalui mekanisme trigger yang aman.

## 4.2 Membuat dan Bergabung ke Grup

### Membuat Grup

- Pengguna yang sudah login dapat membuat grup.
- Pembuat grup otomatis menjadi ketua.
- Setiap grup memiliki nama grup.
- Setiap grup memiliki link undangan.
- Setiap grup memiliki kode undangan unik sepanjang enam karakter.

Format link undangan:

```text
https://domain.com/join/<group_id>
```

Contoh kode undangan:

```text
92d9c1
```

### Bergabung ke Grup

1. Ketua membagikan link undangan kepada anggota.
2. Anggota membuka link.
3. Anggota melakukan login atau registrasi.
4. Anggota memasukkan kode undangan enam karakter.
5. Sistem memvalidasi kode undangan.
6. Jika valid dan kapasitas grup tersedia, anggota ditambahkan ke grup.

### Batas Jumlah Anggota

- Minimal 2 orang termasuk ketua.
- Maksimal 5 orang termasuk ketua.
- Artinya, satu grup terdiri dari 1 ketua dan maksimal 4 anggota.

Ketua belum dapat menerbitkan tugas jika jumlah anggota grup belum mencapai minimal 2 orang.

## 4.3 Menyusun dan Menerbitkan Tugas

Ketua dapat membuat tugas dengan status awal `draft`.

Setiap tugas memiliki:

| Atribut | Ketentuan |
|---|---|
| Judul | Wajib |
| Deskripsi | Opsional |
| Deadline | Opsional |
| Status | Draft |

### Pengelolaan Draft

Selama tugas masih berstatus `draft`, ketua dapat:
- Menambahkan tugas.
- Mengedit tugas.
- Menghapus tugas.

### Menerbitkan Tugas

Ketika tugas siap dibagikan:

1. Ketua menekan tombol **Kirim ke anggota**.
2. Sistem menampilkan dialog konfirmasi.
3. Contoh pesan: "Yakin ingin menerbitkan tugas ini kepada seluruh anggota?"
4. Setelah dikonfirmasi, seluruh tugas draft diubah menjadi `todo`.
5. Waktu penerbitan dicatat pada `diterbitkan_at`.
6. Tugas muncul pada papan Kanban anggota.

Ketua tetap dapat menambahkan tugas baru setelah penerbitan pertama. Tugas baru akan berstatus `draft` sampai diterbitkan kembali.

Penerbitan tugas hanya dapat dilakukan jika jumlah anggota minimal 2 orang termasuk ketua.

## 4.4 Alur Status Tugas

Alur utama:

```text
Draft
  |
  v
To Do
  |
  v
Doing
  |
  v
Under Review
  |
  +------ Disetujui Ketua ------> Done
  |
  +------ Ditolak Ketua --------> Doing
```

Jika ketua menolak hasil pekerjaan, tugas kembali ke `doing` dan anggota harus memperbaiki pekerjaan berdasarkan catatan revisi.

### Detail Transisi Status

| Dari | Ke | Pelaku | Aksi |
|---|---|---|---|
| Draft | To Do | Ketua | Menerbitkan tugas |
| To Do | Doing | Anggota | Mengambil tugas |
| Doing | Under Review | Pemilik tugas | Menandai pekerjaan selesai |
| Under Review | Done | Ketua | Menyetujui pekerjaan |
| Under Review | Doing | Ketua | Menolak pekerjaan dengan catatan revisi |
| Doing | To Do | Pemilik tugas | Melepas tugas sendiri |
| Doing | To Do | Ketua | Melepas tugas secara paksa |
| Done | Doing | Ketua | Membuka kembali tugas |

### Aturan Status dan Kepemilikan

1. Tugas hanya dapat diambil jika statusnya `todo`.
2. Tugas yang diambil harus memiliki `dikerjakan_oleh IS NULL`.
3. Satu tugas hanya boleh memiliki satu pemilik.
4. Ketika tugas diambil, kolom `dikerjakan_oleh` dan `diambil_at` diisi.
5. Hanya pemilik tugas yang dapat menandai pekerjaan selesai.
6. Hanya ketua yang dapat menyetujui atau menolak pekerjaan.
7. Catatan revisi wajib diisi saat tugas ditolak.
8. Setelah ditolak, tugas kembali ke `doing` dengan pemilik yang sama.
9. Anggota dapat melepas tugas miliknya sendiri.
10. Ketua dapat melepas tugas secara paksa.
11. Ketika tugas dilepas, pemilik dikosongkan dan status menjadi `todo`.
12. Tugas berstatus `done` terkunci.
13. Ketua dapat membuka kembali tugas Done.
14. Ketika dibuka kembali, tugas menjadi `doing` dan tetap dimiliki anggota sebelumnya.

Seluruh aturan tersebut wajib divalidasi di database.

---

# 5. Perhitungan Kontribusi

Kontribusi anggota dihitung berdasarkan jumlah tugas yang telah diselesaikan dan disetujui ketua.

## 5.1 Rumus Kontribusi

```text
kontribusi_persen =
(jumlah_tugas_done_milik_anggota / total_tugas_diterbitkan) * 100
```

Nilai per tugas:

```text
nilai_per_tugas = 100 / total_tugas_diterbitkan
```

### Contoh

Sebuah grup memiliki 10 tugas yang telah diterbitkan.

| Anggota | Tugas Done | Kontribusi |
|---|---:|---:|
| Anggota A | 4 | 40% |
| Anggota B | 3 | 30% |
| Anggota C | 2 | 20% |
| Anggota D | 1 | 10% |

Total kontribusi: 100%.

## 5.2 Ketentuan Perhitungan

- Hanya tugas berstatus `done` yang dihitung.
- Tugas berstatus `draft` tidak masuk perhitungan.
- Penyebut menggunakan seluruh tugas yang sudah diterbitkan.
- Tugas yang dibuka kembali oleh ketua tidak lagi dihitung sebagai kontribusi selesai.
- Jika belum ada tugas yang diterbitkan, kontribusi ditampilkan sebagai 0%.
- Kontribusi dihitung secara otomatis oleh database.

Persentase kontribusi seluruh anggota dapat kurang dari 100% jika masih terdapat tugas yang belum selesai.

---

# 6. Laporan Kontribusi

Laporan kontribusi dapat dilihat oleh seluruh anggota grup.

Informasi yang ditampilkan:

| Informasi | Keterangan |
|---|---|
| Nama anggota | Nama pengguna |
| Tugas diambil | Jumlah tugas yang pernah atau sedang dikerjakan |
| Tugas selesai | Jumlah tugas berstatus Done |
| Kontribusi | Persentase kontribusi anggota |
| Tepat waktu | Jumlah tugas yang diselesaikan sebelum atau pada deadline |

### Ketentuan Ketepatan Waktu

Tugas dianggap selesai tepat waktu jika tanggal penyelesaian tidak melewati tanggal deadline.

```text
tanggal_selesai <= deadline
```

- Tugas tanpa deadline tidak dihitung sebagai tepat waktu maupun terlambat.
- Tugas yang selesai setelah deadline tidak dihitung sebagai tepat waktu.
- Tugas yang dibuka kembali tidak dihitung sebagai tugas selesai sampai disetujui kembali.

### Ekspor Laporan

Laporan kontribusi dapat diekspor ke PDF untuk digunakan sebagai bukti pembagian pekerjaan kepada dosen.

---

# 7. Ringkasan Grup

Dashboard grup menampilkan ringkasan pekerjaan.

Informasi yang ditampilkan:

- Total tugas diterbitkan.
- Jumlah tugas tersedia (`todo`).
- Jumlah tugas sedang dikerjakan (`doing`).
- Jumlah tugas menunggu review (`under_review`).
- Jumlah tugas selesai (`done`).
- Jumlah tugas terlambat.

Tugas terlambat adalah tugas yang memiliki deadline sebelum tanggal saat ini dan belum berstatus `done`.

---

# 8. Penanda Deadline

| Kondisi | Label UI | Warna |
|---|---|---|
| Status Done | Selesai | Hijau tua |
| Tidak ada deadline | Tanpa deadline | Abu-abu |
| Deadline telah lewat dan belum Done | Terlambat | Merah |
| Deadline dalam 2 hari dan belum Done | Mepet | Oranye |
| Deadline masih jauh | Aman | Hijau muda |

Status Done harus diprioritaskan sebagai penanda selesai meskipun deadline sudah lewat.

---

# 9. Desain Database

Database menggunakan Supabase PostgreSQL.

Seluruh tabel aplikasi berada pada schema `public`.

## 9.1 Tabel `profiles`

Menyimpan informasi profil pengguna.

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | Primary key, references `auth.users(id)` |
| `nama` | text | NOT NULL |
| `avatar_url` | text | Opsional |
| `created_at` | timestamptz | DEFAULT now() |

## 9.2 Tabel `groups`

Menyimpan informasi grup.

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | Primary key, DEFAULT gen_random_uuid() |
| `nama` | text | NOT NULL |
| `kode_undangan` | text | UNIQUE, NOT NULL, enam karakter acak |
| `dibuat_oleh` | uuid | References profiles(id) |
| `created_at` | timestamptz | DEFAULT now() |

Jumlah anggota sebaiknya dihitung melalui tabel `group_members` agar tidak terjadi ketidaksinkronan data.

## 9.3 Tabel `group_members`

Menyimpan hubungan pengguna dengan grup.

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `group_id` | uuid | References groups(id) ON DELETE CASCADE |
| `user_id` | uuid | References profiles(id) ON DELETE CASCADE |
| `role` | text | `ketua` atau `member` |
| `joined_at` | timestamptz | DEFAULT now() |

Primary key:

```sql
PRIMARY KEY (group_id, user_id)
```

Pastikan hanya terdapat satu ketua pada setiap grup.

## 9.4 Tabel `tasks`

Menyimpan seluruh tugas.

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | Primary key, DEFAULT gen_random_uuid() |
| `group_id` | uuid | References groups(id) ON DELETE CASCADE |
| `judul` | text | NOT NULL |
| `deskripsi` | text | Opsional |
| `deadline` | date | Opsional |
| `status` | text | draft, todo, doing, under_review, done |
| `dikerjakan_oleh` | uuid | References profiles(id), nullable |
| `catatan_revisi` | text | Opsional |
| `diterbitkan_at` | timestamptz | Waktu penerbitan |
| `diambil_at` | timestamptz | Waktu tugas diambil |
| `selesai_at` | timestamptz | Waktu tugas disetujui menjadi Done |
| `dikunci` | boolean | DEFAULT false |
| `created_at` | timestamptz | DEFAULT now() |

Gunakan CHECK constraint untuk membatasi nilai status.

Status yang diperbolehkan:

```text
draft
todo
doing
under_review
done
```

## 9.5 Tabel `task_history`

Menyimpan riwayat aktivitas tugas.

| Kolom | Tipe | Ketentuan |
|---|---|---|
| `id` | uuid | Primary key |
| `task_id` | uuid | References tasks(id) ON DELETE CASCADE |
| `user_id` | uuid | References profiles(id) |
| `aksi` | text | Jenis tindakan |
| `catatan` | text | Opsional |
| `created_at` | timestamptz | DEFAULT now() |

Jenis aksi:

```text
ambil
selesai
disetujui
ditolak
dilepas
lepas_paksa
dibuka_kembali
diterbitkan
```

Tabel ini digunakan untuk menyimpan jejak audit sehingga aktivitas pengerjaan dapat ditelusuri.

Riwayat aktivitas sebaiknya dicatat dalam transaksi yang sama dengan perubahan data tugas.

---

# 10. Fungsi Database (RPC)

Frontend memanggil seluruh fungsi bisnis menggunakan:

```js
supabase.rpc('nama_fungsi', {
  parameter: nilai
})
```

Daftar fungsi yang dibutuhkan:

| Nama Fungsi | Parameter | Fungsi |
|---|---|---|
| `buat_grup(nama_grup)` | nama_grup: text | Membuat grup dan menambahkan pembuat sebagai ketua |
| `gabung_grup(kode)` | kode: text | Memvalidasi kode dan menambahkan anggota |
| `kirim_tugas(group_id)` | gid: uuid | Menerbitkan tugas draft menjadi todo |
| `ambil_tugas(task_id)` | tid: uuid | Mengambil tugas secara atomik |
| `selesaikan_tugas(task_id)` | tid: uuid | Mengubah doing menjadi under_review |
| `setujui_tugas(task_id)` | tid: uuid | Mengubah under_review menjadi done |
| `tolak_tugas(task_id, catatan)` | tid: uuid, catatan: text | Mengembalikan tugas ke doing dengan catatan revisi |
| `lepas_tugas(task_id)` | tid: uuid | Melepas tugas milik anggota |
| `lepas_paksa(task_id)` | tid: uuid | Ketua melepas tugas anggota |
| `buka_kembali(task_id)` | tid: uuid | Membuka kembali tugas done |
| `kontribusi_grup(group_id)` | gid: uuid | Menghitung kontribusi anggota |
| `ringkasan_grup(group_id)` | gid: uuid | Menghitung ringkasan grup |

## 10.1 Ketentuan Implementasi RPC

1. Identitas pengguna diperoleh dari `auth.uid()`.
2. Jangan menerima identitas pengguna dari frontend sebagai dasar otorisasi.
3. Setiap fungsi harus memvalidasi keanggotaan pengguna.
4. Fungsi khusus ketua harus memvalidasi role ketua.
5. Perubahan status harus divalidasi berdasarkan status sebelumnya.
6. Fungsi harus memvalidasi kepemilikan tugas.
7. Fungsi harus memvalidasi kondisi `dikunci`.
8. Fungsi `ambil_tugas()` harus aman terhadap race condition.
9. Gunakan conditional update atau row locking untuk pengambilan tugas.
10. Fungsi `SECURITY DEFINER` wajib menetapkan `search_path` yang aman.
11. Perubahan tugas dan pencatatan riwayat harus dilakukan secara atomik.

---

# 11. Row Level Security (RLS)

## 11.1 Prinsip Keamanan

- Pengguna hanya dapat mengakses data grup tempat ia menjadi anggota.
- Pengguna hanya dapat mengubah profil miliknya sendiri.
- Pengguna tidak boleh mengubah role miliknya sendiri.
- Pembuatan grup dilakukan melalui `buat_grup`.
- Penambahan anggota dilakukan melalui `gabung_grup`.
- Perubahan status tugas dilakukan melalui RPC.
- RLS harus aktif pada seluruh tabel.
- Jangan mengandalkan frontend sebagai satu-satunya pengamanan.

## 11.2 Matriks Kebijakan

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | Pengguna login sesuai kebijakan profil | Trigger otomatis | Pemilik profil | Tidak tersedia |
| groups | Anggota grup | Fungsi buat_grup | Ketua melalui fungsi | Fungsi khusus jika tersedia |
| group_members | Sesama anggota grup | Fungsi buat_grup/gabung_grup | Tidak tersedia | Keluar grup sesuai aturan |
| tasks | Anggota grup | Ketua melalui mekanisme tervalidasi | RPC | Ketua untuk draft |
| task_history | Anggota grup terkait | Fungsi database | Tidak tersedia | Tidak tersedia |

Semua policy harus memastikan pengguna tidak dapat memperoleh akses ke grup lain dengan memanipulasi ID.

---

# 12. Halaman dan Navigasi Aplikasi

| Halaman | URL | Fungsi |
|---|---|---|
| Login / Daftar | `/login` | Autentikasi pengguna |
| Dashboard | `/dashboard` | Menampilkan grup pengguna |
| Buat Grup | Modal `/dashboard` | Membuat grup |
| Gabung Grup | `/join/[group_id]` | Bergabung dengan kode undangan |
| Detail Grup | `/grup/[id]` | Kanban, ringkasan, dan realtime |
| Anggota | `/grup/[id]/anggota` | Daftar anggota |
| Susun Tugas | `/grup/[id]/susun` | CRUD draft dan penerbitan |
| Kontribusi | `/grup/[id]/kontribusi` | Laporan kontribusi |

### Aksi pada Kanban

| Aksi | Fungsi RPC |
|---|---|
| Saya kerjakan | `ambil_tugas(task_id)` |
| Tandai selesai | `selesaikan_tugas(task_id)` |
| Setujui | `setujui_tugas(task_id)` |
| Tolak | `tolak_tugas(task_id, catatan)` |
| Lepas tugas | `lepas_tugas(task_id)` |
| Lepas paksa | `lepas_paksa(task_id)` |
| Buka kembali | `buka_kembali(task_id)` |

---

# 13. Tampilan Kanban dan Interaksi

| Status | Label UI | Warna | Tombol |
|---|---|---|---|
| draft | Draft | Abu-abu | Edit, Hapus |
| todo | Tersedia | Biru muda | Saya kerjakan |
| doing | Sedang dikerjakan | Kuning/oranye | Tandai selesai, Lepas, Lepas paksa |
| under_review | Menunggu review | Ungu | Setujui, Tolak |
| done | Selesai | Hijau | Buka kembali |

Tombol harus menyesuaikan:
- Role pengguna.
- Status tugas.
- Kepemilikan tugas.
- Kondisi penguncian.

Meskipun tombol disembunyikan berdasarkan hak akses, database tetap harus memvalidasi setiap tindakan.

---

# 14. Supabase Realtime

Realtime diaktifkan pada tabel `tasks` melalui publication `supabase_realtime`.

Contoh implementasi:

```js
supabase
  .channel(`tasks-${grupId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `group_id=eq.${grupId}`,
    },
    () => muatUlangTugas()
  )
  .subscribe()
```

Ketika ada anggota:
- Mengambil tugas.
- Menyelesaikan tugas.
- Melepas tugas.
- Mengubah progres tugas.

Papan Kanban anggota lain harus diperbarui secara otomatis.

Pastikan konfigurasi RLS dan Realtime tidak membocorkan perubahan dari grup lain.

---

# 15. Aturan Bisnis Utama

1. Tugas hanya dapat diambil jika `status = 'todo'` dan `dikerjakan_oleh IS NULL`.
2. Satu tugas hanya memiliki satu pemilik.
3. Hanya pemilik atau ketua yang dapat melakukan tindakan yang diizinkan pada tugas doing.
4. Hanya ketua yang dapat mereview tugas under_review.
5. Tugas done terkunci dengan `dikunci = true`.
6. Ketua dapat membuka kembali tugas done.
7. Minimal anggota adalah 2 orang termasuk ketua.
8. Maksimal anggota adalah 5 orang termasuk ketua.
9. Ketua tidak dapat menerbitkan tugas jika anggota belum mencapai jumlah minimum.
10. Catatan revisi wajib diisi ketika tugas ditolak.
11. Kontribusi hanya dihitung dari tugas done.
12. Total tugas untuk kontribusi adalah tugas yang telah diterbitkan.
13. Tugas draft tidak dihitung sebagai kontribusi.
14. Deadline dikirim dalam format `YYYY-MM-DD` atau `null`.
15. String kosong tidak boleh digunakan sebagai nilai deadline.
16. Status tugas hanya boleh `draft`, `todo`, `doing`, `under_review`, dan `done`.
17. Seluruh validasi bisnis dilakukan di database.
18. Setiap perubahan penting dicatat dalam `task_history`.

---

# 16. Struktur Repository

Struktur awal repository Gotaks:

```text
gotaks/
├── .env.example
├── .gitignore
├── README.md
├── docs/
│   ├── context.md
│   └── backend.md
├── database/
│   └── schema.sql
└── lib/
    ├── supabase.js
    └── api.js
```

### Keterangan

| File | Fungsi |
|---|---|
| `.env.example` | Contoh environment variables |
| `.gitignore` | Mengabaikan file sensitif |
| `README.md` | Dokumentasi proyek |
| `docs/context.md` | Konteks bisnis dan spesifikasi sistem |
| `docs/backend.md` | Dokumentasi kontrak backend |
| `database/schema.sql` | Struktur tabel, trigger, RLS, dan RPC |
| `lib/supabase.js` | Inisialisasi Supabase |
| `lib/api.js` | Wrapper pemanggilan RPC |

---

# 17. Kriteria Penerimaan Sistem

## 17.1 Authentication dan Grup

- Pengguna dapat registrasi dan login.
- Pengguna dapat login dengan Google.
- Profil dibuat secara otomatis.
- Pengguna dapat mengedit nama profil.
- Pembuat grup otomatis menjadi ketua.
- Anggota dapat bergabung menggunakan kode undangan.
- Grup tidak dapat melebihi lima orang termasuk ketua.
- Pengguna bukan anggota tidak dapat mengakses data grup.

## 17.2 Task Management

- Ketua dapat membuat tugas draft.
- Ketua dapat mengedit dan menghapus tugas draft.
- Tugas dapat diterbitkan kepada anggota.
- Tugas yang belum diterbitkan tidak dapat diambil anggota.
- Tugas hanya dapat diambil oleh satu anggota.
- Status tugas mengikuti alur yang ditentukan.
- Anggota dapat melepas tugas miliknya.
- Ketua dapat melepas tugas secara paksa.

## 17.3 Review System

- Anggota dapat mengirim tugas untuk direview.
- Ketua dapat menyetujui tugas.
- Ketua dapat menolak tugas dengan catatan revisi.
- Penolakan tanpa catatan revisi harus ditolak database.
- Anggota dapat memperbaiki pekerjaan yang ditolak.
- Tugas Done terkunci.
- Ketua dapat membuka kembali tugas Done.

## 17.4 Contribution Tracking

- Kontribusi hanya menghitung tugas Done.
- Tugas draft tidak masuk perhitungan.
- Persentase menggunakan total tugas diterbitkan.
- Ketepatan waktu dihitung berdasarkan deadline.
- Semua anggota dapat melihat laporan kontribusi.
- Laporan dapat diekspor ke PDF.

## 17.5 Security dan Realtime

- RLS aktif di seluruh tabel.
- Pengguna tidak dapat mengubah role sendiri.
- Pengguna tidak dapat mengambil tugas milik anggota lain.
- Pengguna tidak dapat mengakses grup lain.
- Race condition pada pengambilan tugas ditangani.
- Perubahan tugas diperbarui melalui Realtime.
- `service_role` key tidak digunakan di frontend.

---

# 18. Instruksi untuk AI Agent

Saat mengembangkan Gotaks, ikuti seluruh ketentuan berikut:

1. Jadikan dokumen ini sebagai acuan utama konteks bisnis dan spesifikasi sistem.
2. Gunakan nama aplikasi **Gotaks** di seluruh bagian aplikasi.
3. Gunakan tagline resmi: **"Kerja kelompok yang jelas, adil, dan terukur."**
4. Jangan mengubah kebutuhan bisnis tanpa alasan dan persetujuan.
5. Jangan membuat query langsung ke tabel dari frontend untuk operasi bisnis.
6. Gunakan RPC untuk seluruh operasi bisnis.
7. Jangan menggunakan `service_role` key di frontend.
8. Pastikan RLS aktif pada seluruh tabel.
9. Implementasikan validasi hak akses dan transisi status di database.
10. Gunakan transaksi untuk operasi yang mengubah beberapa data sekaligus.
11. Pastikan `ambil_tugas()` aman terhadap race condition.
12. Jangan mengirim deadline sebagai string kosong.
13. Jangan menambahkan status di luar lima status yang telah ditentukan.
14. Jangan mengandalkan validasi frontend sebagai satu-satunya pengamanan.
15. Pertahankan konsistensi nama tabel, kolom, fungsi, parameter, dan status.
16. Catat perubahan penting pada `task_history`.
17. Pastikan seluruh halaman memiliki penanganan loading, error, dan empty state.
18. Pastikan tampilan responsif untuk desktop maupun perangkat mobile.
19. Jangan mengarang hasil implementasi atau menyatakan fitur selesai sebelum benar-benar diuji.
20. Jika terdapat perubahan spesifikasi, perbarui dokumentasi dan implementasi terkait secara konsisten.

---

# 19. Keputusan Spesifikasi

Keputusan baseline yang digunakan:

| Topik | Keputusan |
|---|---|
| Nama aplikasi | Gotaks |
| Tagline | Kerja kelompok yang jelas, adil, dan terukur. |
| Minimum anggota | 2 orang termasuk ketua |
| Maksimum anggota | 5 orang termasuk ketua |
| Status Done | Terkunci |
| Membuka kembali tugas | Dapat dilakukan ketua |
| Login | Google OAuth dan email-password |
| Ekspor laporan | PDF |
| Audit log | Menggunakan task_history |
| Database | Supabase PostgreSQL |
| Backend logic | PostgreSQL Functions / RPC |
| Frontend | Next.js atau Vite + React |
| Styling | Tailwind CSS |
| Deployment | Vercel |

Dokumen ini menjadi sumber acuan utama pengembangan Gotaks dan dapat diperbarui apabila terdapat keputusan atau kebutuhan baru.
