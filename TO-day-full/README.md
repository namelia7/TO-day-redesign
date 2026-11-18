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

```
Email    : johndoe@gmail.com
Password : pass1234
```

Akun ini dibuat otomatis oleh `npm run seed` dan sudah berstatus Premium.
Kamu juga bisa mendaftar akun baru lewat halaman Register — ini akun
sungguhan yang tersimpan di database, bukan simulasi.

## Apa yang BERBEDA dari versi demo

| Aspek | Versi demo | Versi ini |
|---|---|---|
| Login | 1 akun hardcoded di kode frontend | Register/login sungguhan, password di-hash (bcrypt), sesi via JWT |
| Data pengguna | localStorage browser | Database PostgreSQL di server |
| Penilaian jawaban | Dihitung di browser (bisa dimanipulasi lewat devtools) | Dihitung di server; kunci jawaban tidak pernah dikirim ke browser sebelum tryout selesai |
| Leaderboard | Data hardcoded (`Alya R.`, `Raka P.`, dst) | Dihitung dari skor tertinggi tiap pengguna sungguhan di database |
| Statistik | Data hardcoded 14 hari | Dihitung dari riwayat tryout sungguhan milik pengguna yang login |
| Pembayaran | Simulasi di state lokal | QRIS via WhatsApp (verifikasi admin) atau Midtrans Snap bila kredensial tersedia |

## Pembayaran

### Mode manual: QRIS via WhatsApp (default, tanpa Midtrans)
1. Pembeli klik Upgrade → **Buat Order & Minta QRIS**.
2. Server membuat order `TO-M-<id>` berstatus `pending` dan mengembalikan link
   `wa.me` dengan pesan berisi order ID, nama, email.
3. Admin mengirim gambar QRIS di chat WhatsApp; pembeli membayar Rp 19.000 dan
   mengirim bukti.
4. Admin membuka `/admin`, memasukkan `ADMIN_TOKEN`, lalu klik **Setujui**.
   Premium aktif 1 bulan; status `paid` hanya bisa diubah lewat endpoint admin.

Env yang dibutuhkan: `MANUAL_PAYMENT_ENABLED=true`, `WHATSAPP_NUMBER`,
`MANUAL_HOLD_HOURS`, `ADMIN_TOKEN` (lihat `server/.env.example`).

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

1. **Bank soal masih terbatas (8 soal)** — soal di database ini hanya contoh
   latihan, bukan soal UTBK resmi. Tambahkan lewat `server/src/db/seed.js` atau
   bangun panel admin terpisah.
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
  manual—`MANUAL_PAYMENT_ENABLED=true`, `WHATSAPP_NUMBER`, `ADMIN_TOKEN`.
  Schema database otomatis dibuat saat start di produksi; set `RUN_SEED=true`
  sekali untuk mengisi soal/tryout, lalu hapus lagi.
- **Frontend**: Vercel (framework Vite). Set `VITE_API_URL` ke URL backend,
  `VITE_MIDTRANS_CLIENT_KEY`, dan `VITE_MIDTRANS_IS_PRODUCTION`. File
  `vercel.json` sudah menangani rewrite SPA. Halaman admin ada di `/admin`.
- Aktifkan HTTPS di kedua sisi sebelum menerima data pengguna sungguhan.

## Build untuk produksi

```bash
# Frontend
npm run build        # hasil di folder dist/

# Backend tidak perlu "build" terpisah -- jalankan langsung dengan:
cd server && npm start
```
