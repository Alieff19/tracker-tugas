# GoTaks — Tracker Tugas Kelompok & Laporan Kontribusi Mahasiswa

> *"Kerja kelompok yang jelas, adil, dan terukur."*

GoTaks adalah aplikasi web manajemen tugas kelompok mahasiswa yang menggabungkan **Papan Kanban Realtime**, **Sistem Review Ketua**, dan **Laporan Kontribusi Otomatis** yang siap dicetak sebagai bukti pembagian kerja ke dosen.

Dibangun di atas Supabase dengan arsitektur **Backend-as-a-Service**: seluruh logika bisnis berjalan di dalam database melalui PostgreSQL RPC functions dan Row Level Security, sehingga tidak ada server backend terpisah yang perlu dikelola.

---

## 🔗 Demo

**Link aplikasi:** https://gotaks.vercel.app

**Akun demo siap pakai:**

| Email | Password | Role |
|---|---|---|
| ketua@gotaks.com | Ketua123! | Ketua grup |
| anggota@gotaks.com | Anggota123! | Anggota |
| anggota2@gotaks.com | Anggota2123! | Anggota |

---

## ✨ Fitur Utama

- **Grup dengan kode undangan** — buat grup dan bagikan kode 6 karakter atau link ke anggota
- **Papan kanban realtime** — 5 status: Draft → To Do → Doing → Under Review → Done; update otomatis tanpa refresh
- **Ambil tugas cepat-cepatan** — anggota bebas memilih tugas; siapa klik duluan dia yang pegang
- **Sistem review ketua** — anggota tandai selesai → Under Review → ketua setujui atau tolak + catatan revisi
- **Laporan kontribusi otomatis** — persentase kontribusi tiap anggota dihitung dari tugas yang disetujui ketua
- **Ekspor PDF** — laporan kontribusi siap cetak untuk dilampirkan ke dosen
- **Penanda deadline** — 🔴 terlambat · 🟠 mepet (≤2 hari) · 🟢 aman
- **Login Google** — atau daftar dengan email dan password

---

## 📋 Alur Penggunaan

```
1. Ketua daftar/login → buat grup → dapat kode undangan
2. Anggota buka link /join/<group_id> → masukkan kode → masuk grup
3. Ketua susun tugas (draft) → konfirmasi → kirim ke anggota
4. Anggota klik "Saya kerjakan" → kerjakan → tandai selesai
5. Ketua review → setujui (Done) atau tolak + tulis catatan revisi
6. Semua anggota bisa lihat laporan kontribusi → ekspor PDF
```

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, RPC `security definer`, Realtime, Auth)
- **Deployment:** Vercel

---

## 📁 Struktur Proyek

```text
├── app/
│   ├── page.js                       # Landing page GoTaks
│   ├── login/page.js                 # Login & Daftar (Email, Google OAuth, Akun Demo)
│   ├── dashboard/page.js             # Daftar grup saya, Buat grup, Gabung via kode
│   ├── join/[group_id]/page.js       # Halaman undangan grup (/join/<group_id>)
│   └── grup/[id]/
│       ├── page.js                   # Papan Kanban Realtime + Ringkasan Progres
│       ├── susun/page.js             # Susun & Kirim Tugas Draft (Khusus Ketua)
│       ├── anggota/page.js           # Daftar Anggota & Bagikan Kode Undangan
│       └── kontribusi/page.js        # Laporan Kontribusi & Ekspor PDF ke Dosen
├── components/
│   ├── GrupHeader.js                 # Navigasi grup, role badge, & salin kode
│   └── ToastProvider.js              # Notifikasi toast
├── lib/
│   ├── supabase.js                   # Inisialisasi Supabase Client
│   └── api.js                        # Wrapper seluruh fungsi Auth, Grup, & Tugas
├── database/
│   └── schema.sql                    # Skema PostgreSQL, RLS, dan fungsi RPC Supabase
└── docs/
    ├── CONTEXT.md                    # Konteks bisnis & spesifikasi sistem
    └── backend.md                    # Dokumentasi pemakaian lib/api.js
```

---

## 🚀 Cara Menjalankan di Lokal

**1. Clone repo**
```bash
git clone https://github.com/Alieff19/tracker-tugas.git
cd tracker-tugas
```

**2. Install dependencies**
```bash
npm install
```

**3. Setup environment variable**

Salin `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://zccrhyyyjeobxjjuuxrz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

**4. Jalankan dev server**
```bash
npm run dev
```

**5. Buka di browser**
```
http://localhost:3000
```

> Database Supabase sudah online dan siap digunakan. Tidak perlu setup database lokal.

---

## ☁️ Cara Deploy ke Vercel

1. Push repo ke GitHub:
   ```bash
   git add . && git commit -m "feat: GoTaks fullstack app" && git push
   ```
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo ini.
3. Di bagian **Environment Variables** tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Klik **Deploy**.

---

## 🗄️ Tentang Database

Seluruh skema database (tabel, RLS, fungsi) ada di `database/schema.sql`. File ini hanya digunakan untuk membuat database dari nol pada project Supabase yang masih kosong. Untuk project yang sudah berjalan, database tidak perlu dijalankan ulang.

Login Google tersedia di halaman login. Fitur ini aktif setelah Google OAuth dikonfigurasi di dashboard Supabase oleh pemilik project.

---

## 🔐 Keamanan

- Data tiap grup terisolasi menggunakan **Row Level Security** di level database
- User hanya bisa mengakses data grup yang dia ikuti
- Semua logika bisnis dijalankan di dalam database via **PostgreSQL RPC functions**
- Publishable key aman dipakai di frontend selama RLS aktif

---

## 📦 Sumber & Lisensi

Proyek ini dibuat untuk keperluan **lomba web programming**.

| Library | Lisensi |
|---|---|
| [Next.js](https://nextjs.org/) | MIT |
| [Supabase](https://supabase.com/) | Apache 2.0 |
| [@supabase/supabase-js](https://github.com/supabase/supabase-js) | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | MIT |

---

## 👥 Tim

| Nama | Peran |
|---|---|
| M. Alief Alfaridzi | Backend & Database |
| Mochammad Isthimata | Frontend & UI |
| Aisyah | Dokumentasi |

---

*Dibuat dengan ❤️ untuk membantu kerja kelompok mahasiswa lebih adil dan terukur.*
