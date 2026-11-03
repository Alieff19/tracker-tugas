# Audit Supabase GoTaks — 3 November 2026

**Status:** laporan ini merekam kondisi sebelum perbaikan. Perbaikan yang telah diterapkan dan hasil tes ada di [SUPABASE-FIXES.md](SUPABASE-FIXES.md).

Proyek: `zccrhyyyjeobxjjuuxrz`. Pemeriksaan baca saja melalui MCP, katalog PostgreSQL, advisor Supabase, kode aplikasi, dan endpoint publik menggunakan konfigurasi `.env.local`. Tidak mengubah schema, akun, data, atau konfigurasi server.

## Kesimpulan

Koneksi tersedia, tetapi kontrol akses database aktif belum mengikuti aturan aplikasi. Prioritaskan RLS tugas dan mekanisme keluar grup sebelum digunakan oleh pengguna umum. Status RLS aktif saja tidak membuktikan kebijakan akses sudah aman.

## Temuan

| Prioritas | Temuan dan bukti | Dampak / perbaikan |
|---|---|---|
| Tinggi | Policy UPDATE `tugas: ubah` di server hanya `is_member(group_id)`, dengan grant UPDATE seluruh kolom. | Semua anggota dapat mengubah status, assignee, waktu selesai, dan lock langsung melalui Data API tanpa persetujuan ketua. Batasi update langsung pada draft oleh ketua; transisi status lewat RPC tervalidasi. |
| Tinggi | SELECT `tugas: lihat` di server hanya `is_member(group_id)`. INSERT hanya `is_ketua(group_id)`, tanpa syarat status draft. | Anggota dapat membaca draft melalui API meski UI memfilternya; ketua dapat memasukkan tugas langsung dengan status done. Terapkan pembatasan draft pada SELECT/INSERT. File lokal sudah lebih ketat, server belum. |
| Tinggi | RPC server `keluar_grup` tidak memeriksa ketua yang masih mempunyai anggota lain. DELETE policy `anggota: keluar` juga mengizinkan penghapusan membership sendiri secara langsung. | Ketua dapat meninggalkan grup tanpa ketua; anggota dapat melewati pelepasan tugas dalam RPC. Hapus akses DELETE langsung dan tegakkan aturan di RPC dengan pemeriksaan membership serta penguncian grup. |
| Tinggi | `ambil_tugas` membaca status lalu UPDATE berdasarkan id saja. RPC transisi lain memakai pola serupa; tidak ada row lock atau kondisi status pada UPDATE. | Permintaan bersamaan bisa menimpa assignee atau menghasilkan transisi tak sesuai status terbaru. Gunakan lock dan validasi setelah lock, atau UPDATE atomik dengan status/assignee yang diharapkan. Ini temuan dari definisi fungsi, belum uji konkurensi. |
| Sedang | `gabung_grup` menghitung anggota lalu INSERT tanpa lock; tidak ada constraint kapasitas. | Beberapa permintaan serentak dapat melewati batas 5 anggota. Serialkan join/leave menggunakan lock pada grup yang sama. |
| Sedang | Endpoint `/auth/v1/settings` mengembalikan `external.google=false`. | Tombol Google di login belum dapat dipakai. Konfigurasikan provider dan redirect URL, atau sembunyikan tombol sampai tersedia. |
| Sedang | Keluar grup hanya melepas tugas `doing`; tugas `under_review`/`done` tetap terhubung ke mantan anggota, sedangkan kontribusi hanya menghitung membership aktif. | Revisi/reopen dapat menghasilkan tugas yang pemiliknya sudah tidak dapat mengakses grup; kontribusi historis tidak lagi mencakup mantan anggota. Tentukan aturan keluar dan riwayat kontribusi. |
| Sedang | `profiles` SELECT untuk semua authenticated memakai `true`. | Semua akun login dapat membaca nama/avatar semua pengguna, meski tidak satu grup. Batasi ke profil sendiri dan rekan grup bila direktori global bukan fitur yang diinginkan. |
| Sedang | Advisor: leaked password protection nonaktif. UI menyediakan akun demo dengan password bersama. | Aktifkan perlindungan bila tersedia pada paket; pisahkan akun demo dari penggunaan nyata. Jangan simpan data nyata dalam akun demo publik. |
| Rendah | Advisor: tidak ada index untuk `groups.dibuat_oleh` dan `tasks.dikerjakan_oleh`; dua policy memanggil `auth.uid()` per baris. | Tambahkan index sesuai kebutuhan dan gunakan `(select auth.uid())` pada policy terkait. Index `idx_tasks_group` belum digunakan bukan alasan cukup untuk menghapusnya saat tabel kosong. |
| Rendah | Riwayat migrations server kosong; schema lokal berbeda dari server. | Sulit memastikan perubahan sudah diterapkan. Gunakan baseline dan migration terkontrol; jangan jalankan ulang seluruh schema lokal karena bukan skrip idempoten. |

## Hardening tambahan

- `handle_new_user`, `is_member`, dan `is_ketua` masih memiliki EXECUTE untuk anon/PUBLIC. Advisor menandainya. Helper memakai `auth.uid()` dan fungsi trigger tidak dapat dijalankan sebagai fungsi SQL biasa; ini bukan bukti kebocoran data otomatis. Cabut grant yang tidak diperlukan, pertimbangkan schema privat untuk helper, dan pertahankan akses yang dibutuhkan policy.
- Advisor menandai 16 fungsi SECURITY DEFINER untuk authenticated. Sebagian memang RPC aplikasi yang disengaja; jangan mengubah semua menjadi INVOKER tanpa menguji RLS dan alur aplikasi. Audit validasi otorisasi setiap fungsi.
- Grant tabel anon/authenticated mencakup TRUNCATE, REFERENCES, TRIGGER di luar kebutuhan aplikasi. Kurangi privilege. Ini tidak berarti endpoint REST menyediakan operasi TRUNCATE.
- `tasks.group_id` nullable, assignee hanya mereferensikan profiles, dan belum ada CHECK yang mengikat status dengan assignee/lock/waktu. Perketat invariants setelah aturan bisnis ditentukan. Nama/judul kosong juga belum dicegah oleh CHECK database.
- Selesai tepat waktu dihitung dari waktu persetujuan ketua (`selesai_at`), bukan waktu submit anggota. Pastikan definisi ini sesuai kebutuhan.

## Pemeriksaan yang lolos

- MCP dapat membaca database dan query berhasil.
- `.env.local` mengarah ke proyek yang sama dengan key berjenis publishable; tidak mencetak nilai key.
- Auth health dan settings HTTP 200. Email signup aktif; konfirmasi email saat ini otomatis (`mailer_autoconfirm=true`).
- REST profiles, tasks_view, dan nested relation group_members→groups HTTP 200 menggunakan publishable key tanpa sesi. Semua hasil kosong, sesuai penolakan baca anonim oleh RLS. Ini menguji routing/grant, bukan akses pengguna login.
- Empat tabel utama dan foreign key tersedia. Tiga auth users mempunyai profil, tidak ada profil yang hilang. Grup/anggota/tugas saat audit semuanya kosong.
- `tasks_view` memakai `security_invoker=true`; trigger profil aktif; tasks terdaftar dalam publication `supabase_realtime`.
- Seluruh 13 RPC bisnis yang dipanggil kode tersedia dengan nama/argumen sesuai; anon tidak diberi EXECUTE untuk RPC tersebut.
- Role anon/authenticated tidak superuser, tidak bypass RLS, dan tidak dapat CREATE pada schema public.
- Statistik database mencatat deadlock=0 dan conflict=0; bukan jaminan tidak ada masalah historis.
- Tidak ada bucket Storage atau Edge Function; aplikasi saat ini tidak membutuhkannya.

## Batas pemeriksaan

Tidak melakukan penulisan data atau simulasi eksploitasi, pengujian konkurensi, pendaftaran akun, maupun login tambahan. Belum menjalankan siklus grup→tugas→review dengan identitas berbeda karena data grup kosong. Publikasi Realtime terpasang, tetapi pengiriman event live belum diuji. Katalog MCP saat audit tidak menyediakan pembacaan log, konfigurasi Auth administratif (Site URL, allowlist, SMTP/rate limits), backup/PITR, billing, atau kesehatan infrastruktur lengkap. Bagian tersebut belum dapat dinyatakan lulus. Koneksi MCP menggunakan hak administratif, bukan bukti bahwa seluruh akses end-user benar.

## Referensi

- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Advisor SECURITY DEFINER anon: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Advisor SECURITY DEFINER authenticated: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Password: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Index: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- RLS initplan: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
