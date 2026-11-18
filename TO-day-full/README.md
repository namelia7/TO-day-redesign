# TO-Day — Full Version

Platform latihan tryout UTBK berbasis web: frontend React + backend Node.js/Express
dengan database sungguhan (PostgreSQL). Proyek ini dikembangkan dari versi demo
`TO-day - Copy` (localStorage only, 1 akun hardcoded) menjadi aplikasi dengan
backend, autentikasi asli, dan data yang benar-benar tersimpan.

## Struktur proyek

```
TO-day-full/
├── src/              # Frontend React (Vite)
├── server/           # Backend API (Node.js + Express + PostgreSQL)
└── README.md         # Dokumen ini
```

## Menjalankan proyek (development)

Butuh dua terminal terpisah: satu untuk backend, satu untuk frontend.

### 1. Jalankan backend

```bash
cd server
npm install
cp .env.example .env    # sesuaikan jika perlu, default sudah bisa langsung dipakai
npm run migrate          # buat tabel di database kosong
npm run seed             # isi soal, tryout, dan akun demo
npm run dev               # jalan di http://localhost:4000
```

### 2. Jalankan frontend

Di terminal terpisah, dari folder utama proyek (bukan dari `server/`):

```bash
npm install
npm run dev               # jalan di http://localhost:5173
```

Buka `http://localhost:5173` di browser. Frontend akan otomatis memanggil
backend di `http://localhost:4000/api` (bisa diubah lewat `VITE_API_URL` di
file `.env`, lihat `.env.example` di folder utama).

### Akun demo

Dibuat/di-reset otomatis oleh `npm run seed` (dan oleh `npm run demo:local`):

```
Admin          : @admin   | admin@today.demo / admin1234
Premium        : @premium | premium@today.demo / premium1234
Belum premium  : @siswa   | siswa@today.demo / siswa1234
```

Akun `@premium` sudah memiliki 12 riwayat tryout lintas 14 hari dengan skor dan
penguasaan subtes yang bervariasi, jadi halaman Statistik dan Leaderboard
langsung berisi data saat presentasi. Login sebagai admin akan diarahkan ke
`/admin` untuk menyetujui pembayaran.

Kamu juga bisa mendaftar akun baru lewat halaman Register. Username wajib diisi,
unik, 3-20 karakter (huruf, angka, underscore), dan tampil di leaderboard.
Ini akun sungguhan yang tersimpan di database, bukan simulasi.

Setiap `npm run seed` (termasuk lewat `demo:local`) mereset password/status
ketiga akun demo dan riwayat latihan akun demo, lalu mengisi ulang statistik
contoh. Setelah presentasi, hapus akun demo dan jangan biarkan
`admin@today.demo` aktif di database produksi:

```sql
DELETE FROM users
 WHERE email IN ('admin@today.demo', 'premium@today.demo', 'siswa@today.demo');
```

Ganti juga `ADMIN_TOKEN`/`JWT_SECRET` jika nilai demo pernah dibagikan.

## Apa yang BERBEDA dari versi demo

| Aspek | Versi demo | Versi ini |
|---|---|---|
| Login | 1 akun hardcoded di kode frontend | Register/login sungguhan, password di-hash (bcrypt), sesi via JWT |
| Data pengguna | localStorage browser | Database PostgreSQL di server |
| Penilaian jawaban | Dihitung di browser (bisa dimanipulasi lewat devtools) | Dihitung di server; kunci jawaban tidak pernah dikirim ke browser sebelum tryout selesai |
| Leaderboard | Data hardcoded (`Alya R.`, `Raka P.`, dst) | Dihitung dari skor tertinggi tiap pengguna sungguhan dan ditampilkan dengan username |
| Statistik | Data hardcoded 14 hari | Dihitung dari riwayat tryout sungguhan milik pengguna yang login |
| Pembayaran | Simulasi di state lokal | QRIS via WhatsApp (verifikasi admin) atau Midtrans Snap bila kredensial tersedia |

## Pembayaran

### Mode manual: QRIS via WhatsApp (default, tanpa Midtrans)
1. Pembeli klik Upgrade → **Buat Order & Minta QRIS**.
2. Server membuat order `TO-M-<id>` berstatus `pending` dan mengembalikan link
   `wa.me` dengan pesan berisi order ID, nama, email.
3. Admin mengirim gambar QRIS di chat WhatsApp; pembeli membayar Rp 40.000 dan
   mengirim bukti transfer ke chat yang sama.
4. Admin login (akun `admin@today.demo`) lalu membuka `/admin` dan klik
   **Setujui**. Premium aktif 1 bulan; status `paid` hanya bisa diubah lewat
   endpoint admin.

Nomor WhatsApp admin untuk demo: **081957052500** (disimpan sebagai
`WHATSAPP_NUMBER=6281957052500`). Template chat otomatis berisi order ID, nama,
email, nominal, dan permintaan gambar QRIS.

Env yang dibutuhkan: `MANUAL_PAYMENT_ENABLED=true`, `WHATSAPP_NUMBER`,
`MANUAL_HOLD_HOURS` (lihat `server/.env.example`). `ADMIN_TOKEN` opsional,
hanya fallback API jika login admin tidak dipakai.

### Mode otomatis: Midtrans Snap
1. `POST /api/payments` membuat baris `payments` `pending` lalu memanggil
   `snap.createTransaction()` dan mengembalikan `token`.
2. Frontend membuka popup Snap (`window.snap.pay`).
3. Midtrans mengirim notifikasi ke `POST /api/payments/webhook`. Signature
   `SHA512(order_id + status_code + gross_amount + serverKey)` diverifikasi
   sebelum status diubah menjadi `paid` dan premium diaktifkan.

Konfigurasi: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
`MIDTRANS_IS_PRODUCTION`, dan `FRONTEND_URL`. Client key juga diisi di `.env`
frontend sebagai `VITE_MIDTRANS_CLIENT_KEY`.

Setelah backend online, isi **Notification URL** di dashboard Midtrans dengan
`https://<domain-backend>/api/payments/webhook`. Mode manual tetap berjalan
meski Midtrans belum aktif.

## Yang MASIH perlu kamu lengkapi sendiri sebelum dipakai sungguhan

1. **Bank soal masih terbatas (140 soal bergaya UTBK)** — soal di database ini
   adalah latihan, bukan soal UTBK resmi. Tambahkan lewat
   `server/src/db/seed-data.js` atau bangun panel admin terpisah.
2. **"Tanya AI" masih balasan template** — bukan panggilan model AI sungguhan.
   Untuk menyambungkannya, tambahkan endpoint backend yang memanggil API AI
   dengan key milikmu (jangan pernah dari frontend).

## Struktur database

Lihat `server/src/db/schema.sql` untuk skema lengkap. Ringkasnya: `users`,
`subtests`, `questions`, `tryouts`, `tryout_questions`, `attempts`,
`question_reports`, `payments`.

## Deploy

- **Backend**: Railway (root directory `server`), tambahkan plugin PostgreSQL,
  lalu set env `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, dan—untuk mode
  manual—`MANUAL_PAYMENT_ENABLED=true`, `WHATSAPP_NUMBER`. `ADMIN_TOKEN`
  opsional (fallback API); admin bisa login lewat akun ber-`is_admin`.
  Schema database otomatis dibuat saat start di produksi; set `RUN_SEED=true`
  sekali untuk mengisi soal/tryout, lalu hapus lagi.
- **Frontend**: Vercel (framework Vite). Set `VITE_API_URL` ke URL backend,
  `VITE_MIDTRANS_CLIENT_KEY`, dan `VITE_MIDTRANS_IS_PRODUCTION`. File
  `vercel.json` sudah menangani rewrite SPA. Halaman admin ada di `/admin`.
- Aktifkan HTTPS di kedua sisi sebelum menerima data pengguna sungguhan.

### Demo cepat: backend lokal + frontend Vercel

Kalau backend belum sempat di-deploy tetapi frontend Vercel harus bisa dipakai user:

1. Isi `server/.env` minimal `DATABASE_URL` (Supabase Session pooler) dan `JWT_SECRET`.
2. Dari root proyek, jalankan:
   ```powershell
   npm run demo:local
   ```
   Script akan melengkapi `ADMIN_TOKEN`, `WHATSAPP_NUMBER` (default
   `6281957052500`), dan `MANUAL_PAYMENT_ENABLED`, menanyakan domain Vercel jika
   belum ada, menjalankan migrasi/seed (termasuk tiga akun demo), menyalakan
   backend, lalu membuat Cloudflare Quick Tunnel. `cloudflared` diunduh otomatis
   (~55 MB, sekali saja). Nilai `VITE_API_URL` juga disalin ke clipboard.
3. Copy nilai `VITE_API_URL` yang dicetak ke Vercel → Settings → Environment Variables
   (Production), lalu **Redeploy**.
4. Pastikan `FRONTEND_URL` di `server/.env` sama dengan domain Vercel. Boleh dikosongkan
   atau diisi `*` untuk demo, tetapi CORS akan mengizinkan semua origin.
5. Tunggu sampai script mencetak `Health check tunnel OK` sebelum membuka URL. Jika HP
   menampilkan DNS error, flush DNS di perangkat atau gunakan data seluler.
6. Jangan tutup terminal selama presentasi. URL `trycloudflare.com` berubah setiap tunnel
   dijalankan; kalau berubah, perbarui `VITE_API_URL` di Vercel dan redeploy. Cegah laptop
   sleep dengan `powercfg /change standby-timeout-ac 0`.

### Memakai project Supabase lama

Kalau ingin tetap memakai project Supabase yang sudah ada (tidak membuat baru):

1. Buka [dashboard Supabase](https://supabase.com/dashboard), pilih project lama.
2. Jika statusnya **Paused**, klik **Restore/Unpause** dan tunggu sampai aktif.
3. Masuk ke **Project Settings → Database → Connection string**, pilih
   **Session pooler** (port `5432`), lalu copy URI-nya.
4. Ganti `[YOUR-PASSWORD]` dengan password database project. Jika lupa, reset
   lewat **Database → Reset database password**.
5. Pastikan host berakhiran `pooler.supabase.com` dan URI memakai
   `?sslmode=require`. Tempel sebagai `DATABASE_URL` di `server/.env`.
6. Jalankan `npm run demo:local`. Script akan menjalankan migrasi, menambah
   kolom `is_admin`, dan membuat tiga akun demo.

Kalau project lama sudah terhapus/tidak muncul di dashboard, datanya tidak bisa
dipulihkan lewat kode; buat project Supabase baru lalu ulangi langkah 3–6.
Akses dashboard dan password database hanya bisa dilakukan dari akun Supabase
kamu.

> Backend lokal + tunnel hanya untuk demo/presentasi, bukan produksi. Tekan Enter di
> terminal untuk menghentikan backend dan tunnel setelah selesai.

## Build untuk produksi

```bash
# Frontend
npm run build        # hasil di folder dist/

# Backend tidak perlu "build" terpisah -- jalankan langsung dengan:
cd server && npm start
```
