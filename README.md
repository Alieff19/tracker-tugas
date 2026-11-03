# GoTaks — Tracker Tugas Kelompok & Laporan Kontribusi Mahasiswa

Perbaikan akses Supabase sudah diterapkan ke proyek aktif. Lihat [hasil perbaikan dan pengujian](docs/SUPABASE-FIXES.md) untuk aturan keluar grup, kontribusi mantan anggota, migration, serta pengaturan OAuth/Auth yang masih memerlukan konfigurasi pemilik proyek. `database/schema.sql` hanya untuk proyek kosong; jangan dijalankan ulang di proyek yang sudah terpasang.

Panduan aktivasi tombol Google dan pilihan akun: [Google Sign-In](docs/GOOGLE-SIGN-IN.md). Tombol tersedia di atas formulir email dan aktif setelah provider Supabase dikonfigurasi.

Aplikasi web manajemen tugas kelompok mahasiswa yang menggabungkan **Papan Kanban Terkunci**, **Sistem Review Ketua**, dan **Laporan Kontribusi Otomatis (Siap Cetak PDF ke Dosen)**.

## Tech Stack
- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, RPC `security definer`, Realtime, Auth)
- **Deployment:** Vercel

---

## Struktur Proyek (1 Repo Utuh)
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

## Cara Menjalankan di Lokal

1. Install dependencies:
   ```bash
   npm install
   ```
2. Pastikan file `.env.local` berisi kredensial Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://zccrhyyyjeobxjjuuxrz.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. Jalankan server development:
   ```bash
   npm run dev
   ```
4. Buka `http://localhost:3000`.

---

## Cara Deploy ke Vercel

1. Push repo ini ke GitHub (`git add . && git commit -m "feat: GoTaks fullstack app" && git push`).
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo GitHub ini.
3. Di bagian **Environment Variables** pada Vercel, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Klik **Deploy**.
