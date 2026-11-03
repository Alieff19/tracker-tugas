# Login, cache, dan Realtime

Perubahan 3 November 2026:

- UI menggunakan sesi browser yang dipulihkan Supabase SDK, menggantikan permintaan `getUser()` berulang pada setiap pembacaan profil/grup. Dashboard sebelumnya memanggil pemeriksaan user jarak jauh tiga kali sebelum seluruh data tampil. Sesi lokal hanya petunjuk UI; JWT tetap divalidasi oleh Supabase dan RLS/RPC tetap menjadi batas otorisasi.
- Cache profil 60 detik, daftar grup 15 detik, dan provider publik 60 detik. Cache hanya di memori, dibatasi per user ID, tidak menyimpan hasil query privat di localStorage/sessionStorage. Refresh penuh halaman tetap melakukan query awal.
- Permintaan serentak dengan key sama digabung. Error tidak disimpan. Invalidasi saat request berlangsung mencegah respons lama mengisi ulang cache.
- Cache akun dibersihkan saat logout, pergantian user, perubahan user, dan keberhasilan mutasi profil/grup/tugas. Event Realtime juga menghapus snapshot yang mungkin usang.
- Tugas, ringkasan, draft dan kontribusi tidak memakai cache TTL. Board dan kontribusi mendengarkan perubahan tabel tasks. Pengiriman anggota mengubah status menjadi under_review, persetujuan ketua menjadi done; kedua perubahan memicu pembacaan terbaru.
- Refresh event dikerjakan berurutan dan event saat request berlangsung memicu catch-up berikutnya. Channel mempunyai nama unik dan dibersihkan saat halaman ditinggalkan. Listener disegarkan saat database tersambung, tab kembali aktif, atau browser online. Fallback saat tab terlihat berjalan tiap 30 detik jika event terlewat; ini tambahan di luar jalur Realtime normal.
- Halaman login melakukan prefetch tujuan navigasi. Provider dipaksa diperiksa ulang saat tab mendapat fokus, sehingga konfigurasi Google yang berubah tetap terbaca.

Verifikasi: 9 tes lulus, mencakup API nyata dengan transport stub, pemisahan akun, penggabungan request, TTL, error/retry, invalidasi selama request, wiring Realtime/focus/reconnect, cleanup dan serialisasi event. Build produksi berhasil. Pada tes API, empat pembacaan profil/grup serentak menghasilkan dua request data; pembacaan ulang saat cache segar tidak menambah request. Ini bukti jumlah permintaan, bukan pengukuran waktu login Google end-to-end. Tidak membuat akun uji atau mengubah database pada perubahan ini.

Mode `next dev` tetap melakukan kompilasi saat rute pertama kali dibuka. Log lokal sebelumnya menunjukkan kompilasi login sekitar 1,4 detik dan respons awal sekitar 2,2 detik. Mode produksi memakai hasil build. Latensi Google OAuth, jaringan, refresh token, dan request awal data tetap dapat memengaruhi login pertama; cache tidak menjanjikan waktu respons tertentu.
