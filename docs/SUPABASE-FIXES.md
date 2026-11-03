# Perbaikan Supabase — 3 November 2026

Sudah diterapkan ke proyek `zccrhyyyjeobxjjuuxrz`, bukan hanya disiapkan sebagai SQL lokal.

## Perubahan database

- Policy tugas membatasi baca draft ke ketua, insert ke draft ketua, serta edit/hapus ke draft ketua.
- Grant kolom membatasi edit langsung ke judul, deskripsi, dan deadline. Status, assignee, lock, dan waktu transisi hanya berubah lewat RPC.
- Membership hanya dapat diubah melalui RPC. Ketua dilarang keluar ketika masih ada anggota lain.
- Join/leave/publish dan seluruh transisi tugas mengunci baris grup terlebih dahulu; transisi juga mengunci tugas sebelum validasi. Permintaan yang menunggu lock memeriksa kondisi terbaru.
- Maksimal satu ketua per grup, group_id tugas wajib, judul/nama tidak kosong, dan CHECK konsistensi status/assignee/lock/timestamp.
- Saat keluar, tugas doing dan under_review kembali todo. Tugas done tetap dikreditkan ke mantan anggota. Reopen tugas milik mantan anggota mengembalikannya ke todo; pemilik aktif tetap doing.
- `submitted_at` mencatat pengiriman untuk review. Ketepatan waktu dihitung dari waktu submit dalam zona Asia/Jakarta, tetap hanya untuk tugas approved. Jika ada data lama, waktu approved menjadi fallback karena waktu submit lama tidak tersedia.
- Profil hanya terlihat oleh dirinya, rekan satu grup, dan untuk atribusi pekerjaan mantan anggota dalam grup yang masih diikuti.
- Seluruh implementasi SECURITY DEFINER dan helper berada di schema private. API public berupa wrapper SECURITY INVOKER dengan signature yang sama. Jangan menambahkan private ke exposed schemas pada Data API.
- Grant anonim dan privilege tabel berlebih dicabut. Trigger profil tidak dapat dipanggil pengguna, tetapi tetap berfungsi ketika auth.users dibuat.
- Index foreign key ditambahkan; panggilan auth.uid pada policy terkait dioptimalkan.

## Aplikasi

- Tombol Google hanya muncul jika provider server aktif. Konfigurasi kredensial Google tidak dibuat atau ditebak.
- Signup menangani kebutuhan konfirmasi email; password signup minimal 8 karakter di UI. Ini bukan pengganti minimum password yang ditegakkan server Auth.
- Redirect login ditolak bila berupa URL eksternal, javascript, backslash, atau bentuk encoded yang berbahaya.
- Error pembacaan sesi/logout ditangani, dan refresh Kanban dilakukan setelah listener database Realtime siap.
- Laporan menampilkan waktu submit dan badge mantan anggota; keterangan keluar grup mengikuti aturan baru.
- Quick demo login nonaktif secara default. Aktifkan `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` hanya di deployment demo terpisah. Akun demo lama tidak dihapus atau diganti passwordnya; menyembunyikan tombol tidak mencabut kredensial yang sebelumnya publik. Jangan gunakan akun tersebut untuk data nyata.
- Versi dependency dipin sesuai lockfile. PostCSS bawaan Next memakai override ke versi patched 8.5.32; npm audit kembali 0 vulnerabilities.

## Migration dan pemasangan

Riwayat server dan nama file lokal diselaraskan:

1. `20261103003217_baseline_gotaks`: baseline schema sebelum audit. Di server yang sudah ada, baseline dicatat melalui pengecekan keberadaan tabel tanpa menjalankan ulang CREATE TABLE. File baseline lengkap digunakan untuk membangun ulang proyek kosong.
2. `20261103003218_harden_gotaks_access`: perbaikan schema, grants, policy, dan RPC; diterapkan melalui MCP dalam migration.

Untuk proyek **kosong**, jalankan dua migration berurutan, atau seluruh `database/schema.sql` sekali saja. File schema merupakan gabungan baseline dan hardening. Jangan menjalankannya ulang di proyek yang sudah terpasang. Untuk proyek saat ini tidak perlu menjalankan SQL lagi. Supabase local stack tidak berjalan di komputer ini; verifikasi history server dilakukan melalui MCP, bukan `migration list` lokal.

## Verifikasi

- `supabase/tests/access_workflow.sql`: lulus dengan enam identitas sementara dan role authenticated. Mencakup trigger profil, RLS draft/outsider, grant kolom, larangan bypass RPC, seluruh 13 RPC, review/revisi/approval/reopen, pelepasan tugas review saat keluar, kontribusi mantan anggota, kapasitas 5, dan penghapusan grup kosong. Semua fixture di-ROLLBACK.
- Uji dua sesi database bersamaan: hanya satu klaim tugas berhasil; klaim kedua ditolak. Dua join untuk satu slot menghasilkan satu keberhasilan dan satu penolakan penuh; jumlah akhir 5.
- `scripts/verify-supabase.mjs`: lulus menggunakan dua akun uji yang telah tersedia. Meliputi login, REST insert/edit draft, draft tersembunyi, RPC publish/claim/submit/approve, penolakan approval oleh anggota, summary/contribution/view, dan event Realtime nyata. Tes menunggu konfirmasi listener PostgreSQL sebelum mutasi. Grup uji dihapus melalui RPC keluar dan sesi uji di-signout lokal.
- `npm test`: tes redirect internal dan penolakan redirect berbahaya.
- `npm run build`: build produksi berhasil.
- Chrome pada build produksi: halaman login terbuka tanpa console error; tombol Google dan quick demo tidak muncul ketika provider/fiturnya nonaktif.
- Keadaan setelah cleanup: 3 auth users, 3 profiles, 0 groups, 0 tasks. Tidak ada pengguna atau grup uji yang tertinggal.
- Advisor security: hanya `auth_leaked_password_protection` yang tersisa. Tidak ada lagi fungsi definer di schema public. Advisor performance hanya informasi index belum dipakai, wajar saat tabel kosong; index tidak dihapus berdasarkan statistik kosong.

Jalankan `npm run verify:supabase` untuk tes endpoint tanpa login. Untuk tes alur penuh gunakan environment `GOTAKS_TEST_LEADER_EMAIL`, `GOTAKS_TEST_MEMBER_EMAIL`, dan `GOTAKS_TEST_PASSWORD` dengan dua akun uji terpilih. Tes membuat dan membersihkan satu grup; jangan gunakan akun produksi yang sensitif.

## Pengaturan eksternal yang masih perlu dilengkapi

- Google OAuth memerlukan Client ID/Secret milik pemilik proyek dan allowlist redirect deployment. Tombol aman tersembunyi selama belum aktif.
- Leaked password protection masih nonaktif; dokumentasi Supabase menyebut fitur ini tersedia pada paket Pro atau lebih tinggi. Tidak ada perubahan paket/biaya yang dilakukan. Aktifkan melalui Auth settings jika paket mendukungnya.
- Set minimum password server Auth minimal 8; UI sudah memvalidasi, tetapi klien lain dapat melewati UI. Konfigurasi administratif Auth tidak tersedia melalui alat MCP saat ini.
- Site URL, redirect allowlist, SMTP, rate limits, backup/PITR, dan billing belum diverifikasi dari konfigurasi administratif. Tidak dinyatakan telah diperbaiki.

Referensi: [password Supabase](https://supabase.com/docs/guides/auth/password-security), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostCSS advisory](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).
