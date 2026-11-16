# TO-Day — Full Version

Platform latihan tryout UTBK berbasis web: frontend React + backend Node.js/Express
dengan database sungguhan (SQLite). Proyek ini dikembangkan dari versi demo
`TO-day - Copy` (localStorage only, 1 akun hardcoded) menjadi aplikasi dengan
backend, autentikasi asli, dan data yang benar-benar tersimpan.

## Struktur proyek

```
TO-day-full/
├── src/              # Frontend React (Vite)
├── server/           # Backend API (Node.js + Express + SQLite)
└── README.md         # Dokumen ini
```

## Menjalankan proyek (development)

Butuh dua terminal terpisah: satu untuk backend, satu untuk frontend.

### 1. Jalankan backend

```bash
cd server
npm install
cp .env.example .env    # sesuaikan jika perlu, default sudah bisa langsung dipakai
npm run seed             # buat database + isi soal, tryout, dan akun demo
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
| Data pengguna | localStorage browser | Database SQLite di server |
| Penilaian jawaban | Dihitung di browser (bisa dimanipulasi lewat devtools) | Dihitung di server; kunci jawaban tidak pernah dikirim ke browser sebelum tryout selesai |
| Leaderboard | Data hardcoded (`Alya R.`, `Raka P.`, dst) | Dihitung dari skor tertinggi tiap pengguna sungguhan di database |
| Statistik | Data hardcoded 14 hari | Dihitung dari riwayat tryout sungguhan milik pengguna yang login |
| Pembayaran | Simulasi di state lokal | Alur transaksi sungguhan tersimpan di database (status pending → paid), **tapi belum terhubung ke payment gateway sungguhan** — lihat catatan di bawah |

## Yang MASIH perlu kamu lengkapi sendiri sebelum dipakai sungguhan

Ini bagian paling penting untuk saya sampaikan dengan jujur — proyek ini
**bukan** aplikasi yang siap dipakai publik tanpa langkah tambahan berikut:

### 1. Payment gateway belum terhubung ke penyedia sungguhan

Alur pembayaran di `server/src/routes/payments.js` sudah lengkap secara
struktur (buat transaksi → konfirmasi → aktifkan premium, semuanya tersimpan
di database), tapi status "paid" saat ini langsung di-set begitu endpoint
`/confirm` dipanggil — **tidak ada verifikasi uang sungguhan masuk**.

Untuk mengaktifkan pembayaran sungguhan, kamu perlu:
1. Mendaftar akun merchant di payment gateway (misalnya Midtrans atau Xendit) —
   ini butuh identitas bisnis/pribadi kamu sendiri, tidak bisa diwakilkan.
2. Memasang SDK resmi mereka di `server/` dan mengganti bagian yang ditandai
   di `payments.js` dengan panggilan API sungguhan ke gateway tersebut.
3. Menambahkan endpoint webhook yang memverifikasi notifikasi pembayaran dari
   gateway (dengan validasi signature), bukan mempercayai konfirmasi dari
   browser pengguna begitu saja.

Catatan lengkap langkah-langkahnya ada di komentar bagian atas file
`server/src/routes/payments.js`.

### 2. Bank soal masih terbatas (8 soal)

Soal di database ini sama persis dengan 8 soal yang ada di versi demo —
hanya soal latihan contoh, bukan soal UTBK resmi. Saya tidak menambah soal
baru sesuai kesepakatan awal kita, dan saya juga tidak bisa menyalin soal
UTBK resmi karena itu berhak cipta milik lembaga penyelenggara (SNPMB/BPPP).
Untuk menambah bank soal, kamu bisa menulis soal sendiri dan memasukkannya
lewat `server/src/db/seed.js`, atau membangun panel admin terpisah (belum
ada di proyek ini).

### 3. Deployment ke server publik belum diatur

Proyek ini dibangun untuk dijalankan secara lokal (`localhost`). Untuk
online-kan:
- Backend: deploy `server/` ke layanan seperti Railway, Render, Fly.io, atau VPS
  sendiri. Ganti `JWT_SECRET` di `.env` dengan string acak yang kuat, dan
  pertimbangkan pindah dari SQLite ke PostgreSQL untuk beban pengguna banyak.
- Frontend: `npm run build` menghasilkan folder `dist/` statis yang bisa
  di-deploy ke Vercel, Netlify, atau layanan statis lain. Set `VITE_API_URL`
  ke URL backend yang sudah online.
- Aktifkan HTTPS di kedua sisi sebelum menerima data pengguna sungguhan.

### 4. "Tanya AI" masih balasan template, bukan AI sungguhan

Fitur Tanya AI di halaman Results menjawab berdasarkan pembahasan soal yang
sudah ada di database (cocokkan nomor soal, atau tampilkan daftar soal yang
salah) — ini bukan panggilan ke model AI sungguhan. Untuk menyambungkannya
ke Claude API, kamu perlu menambahkan endpoint backend baru yang memanggil
Anthropic API dengan API key kamu sendiri (jangan panggil API key langsung
dari frontend, karena itu akan terlihat oleh siapa pun yang membuka devtools
browser).

## Struktur database

Lihat `server/src/db/schema.sql` untuk skema lengkap. Ringkasnya: `users`,
`subtests`, `questions`, `tryouts`, `tryout_questions`, `attempts`,
`question_reports`, `payments`.

## Build untuk produksi

```bash
# Frontend
npm run build        # hasil di folder dist/

# Backend tidak perlu "build" terpisah -- jalankan langsung dengan:
cd server && npm start
```
