# Mengaktifkan Google Sign-In GoTaks

Kode aplikasi sudah meminta Google menampilkan pilihan akun (`prompt=select_account`). Supabase otomatis membuat akun Auth dan trigger membuat profil saat login Google pertama, selama signup aktif. Pengguna tidak perlu mengisi formulir daftar GoTaks. Google tetap dapat meminta login Google atau persetujuan pada kunjungan pertama.

## Google Auth Platform

Proyek Google Cloud `GoTaks` dengan ID `gotaks` sudah dibuat. Pemilik proyek telah membuat OAuth client Web. Client ID dan Client Secret dari file kredensial milik pengguna sudah disimpan langsung melalui Chrome ke provider Google di Supabase. Secret tidak disalin ke repository atau ditampilkan dalam laporan.

1. Pilih proyek GoTaks pada https://console.cloud.google.com/auth/overview.
2. Klik Get started jika belum dikonfigurasi. Isi App name: GoTaks; pilih email support dan email kontak milik Anda. Pilih audience External jika pengguna menggunakan Gmail pribadi. Tinjau dan selesaikan persetujuan Google sendiri.
3. Data Access: gunakan hanya `openid`, `https://www.googleapis.com/auth/userinfo.email`, dan `https://www.googleapis.com/auth/userinfo.profile` untuk login.
4. Clients → Create client → Web application. Nama misalnya GoTaks Web.
5. Authorized JavaScript origins: `http://localhost:3000` dan `http://127.0.0.1:3000`. Tambahkan origin HTTPS website produksi jika sudah ada. Jangan sertakan path pada origin.
6. Authorized redirect URIs: masukkan tepat `https://zccrhyyyjeobxjjuuxrz.supabase.co/auth/v1/callback`.
7. Buat client dan simpan Client ID serta Client Secret di tempat pribadi. Isikan langsung ke Supabase; jangan masukkan Client Secret ke file NEXT_PUBLIC, repository, atau chat.

## Supabase

1. Buka Authentication → Sign In / Providers → Google pada proyek `zccrhyyyjeobxjjuuxrz`.
2. Aktifkan Google. Isi Client ID dan Client Secret dari client Web yang baru dibuat, lalu simpan. Biarkan pemeriksaan nonce aktif.
3. Authentication → URL Configuration: Site URL `http://localhost:3000` selama development; saat deployment ganti ke origin produksi.
4. Tambahkan Redirect URLs `http://localhost:3000/**` dan `http://127.0.0.1:3000/**` untuk development. Untuk produksi, izinkan destination yang digunakan aplikasi (`/dashboard` dan rute undangan `/join/...`); gunakan allowlist yang sesuai domain produksi Anda.
5. Biarkan signup diaktifkan agar pengguna Google baru dapat dibuat otomatis.

Jika Google masih berstatus Testing, tambahkan akun penguji pada Audience bila diminta Google. Untuk penggunaan publik, tinjau kebutuhan publikasi/verification di Google Auth Platform. Jangan menambahkan scope di luar kebutuhan login.

## Verifikasi

Kembali ke tab login GoTaks. Provider diperiksa ulang saat tab mendapat fokus; tombol Google akan aktif bila provider Supabase aktif. Klik Continue with Google, pilih akun, ikuti persetujuan Google jika diminta, lalu pastikan masuk ke dashboard dan profil muncul. Akun yang sama dipakai untuk login berikutnya tanpa mendaftar ulang.

Provider Google kini aktif. Pemeriksaan endpoint Auth mengembalikan HTTP 200 dan authorize mengembalikan HTTP 302 ke `accounts.google.com`, dengan Client ID/callback sesuai file pengguna dan `prompt=select_account`. Site URL sudah `http://localhost:3000`; kedua redirect development di atas sudah tersimpan. Domain Vercel ditambahkan setelah tersedia. Login end-to-end sampai dashboard tetap memerlukan pemilik akun memilih akun dan menyelesaikan persetujuan Google.

Referensi: https://supabase.com/docs/guides/auth/social-sign-in/auth-google dan https://developers.google.com/identity/openid-connect/openid-connect#authenticationuriparameters.
