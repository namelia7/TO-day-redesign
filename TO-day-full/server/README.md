n# TO-Day API (backend)

Backend Node.js + Express untuk aplikasi TO-Day, dengan database PostgreSQL
(via `pg`) dan pembayaran melalui Midtrans Snap.

## Instalasi

```bash
npm install
cp .env.example .env    # isi DATABASE_URL dan kredensial Midtrans
npm run migrate         # buat tabel di database kosong
npm run seed            # isi soal/tryout dan akun demo (kecuali produksi)
npm run dev             # jalan di http://localhost:4000 dengan auto-restart saat file berubah
```

Untuk produksi (tanpa auto-restart): `npm start`.

## Struktur

```
src/
├── index.js              # entry point, setup Express
├── db/
│   ├── schema.sql         # skema tabel
│   ├── index.js            # koneksi database (SSL kondisional)
│   ├── migrate.js           # jalankan schema.sql
│   └── seed.js              # isi data awal (soal, tryout, akun demo)
├── lib/
│   ├── midtrans.js           # instance Snap Midtrans
│   └── premium.js             # aktivasi/perpanjangan premium
├── middleware/
│   ├── auth.js              # verifikasi JWT
│   └── admin.js              # cek admin JWT / token fallback x-admin-token
└── routes/
    ├── auth.js               # register, login, profil
    ├── tryouts.js             # daftar tryout, ambil soal
    ├── attempts.js             # submit jawaban, lihat hasil
    ├── leaderboard.js           # peringkat skor
    ├── stats.js                  # statistik progres belajar
    ├── payments.js                 # Midtrans Snap + QRIS manual via WhatsApp
    └── admin.js                     # verifikasi pembayaran manual
```

## Endpoint utama

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| POST | `/api/auth/register` | - | Daftar akun baru |
| POST | `/api/auth/login` | - | Login, dapat token JWT |
| GET | `/api/auth/me` | ✓ | Profil pengguna saat ini |
| PATCH | `/api/auth/me` | ✓ | Update sekolah/PTN/prodi/target |
| GET | `/api/tryouts` | ✓ | Daftar semua tryout |
| GET | `/api/tryouts/:id/questions` | ✓ | Soal untuk dikerjakan (tanpa kunci jawaban) |
| POST | `/api/tryouts/:id/report` | ✓ | Lapor soal bermasalah |
| POST | `/api/attempts` | ✓ | Submit jawaban (dinilai di server) |
| GET | `/api/attempts/:id` | ✓ | Hasil + pembahasan satu attempt |
| GET | `/api/attempts` | ✓ | Riwayat semua attempt milik pengguna |
| GET | `/api/leaderboard` | ✓ | Peringkat skor tertinggi semua pengguna |
| GET | `/api/stats` | ✓ | Statistik progres pengguna saat ini |
| GET | `/api/payments/price` | ✓ | Harga, mode pembayaran, dan order pending |
| POST | `/api/payments` | ✓ | Buat transaksi Snap (jika Midtrans aktif) |
| POST | `/api/payments/manual` | ✓ | Buat order QRIS via WhatsApp |
| POST | `/api/payments/webhook` | - | Notifikasi Midtrans (verifikasi signature) |
| GET | `/api/payments/:id/status` | ✓ | Status satu transaksi (untuk polling) |
| GET | `/api/payments/history` | ✓ | Riwayat transaksi |
| GET | `/api/admin/payments` | admin | Daftar pembayaran manual |
| POST | `/api/admin/payments/:id/approve` | admin | Setujui pembayaran, aktifkan premium |
| POST | `/api/admin/payments/:id/reject` | admin | Tolak pembayaran manual |

Body registrasi: `{ "name", "username", "email", "password" }`. `username`
harus unik, 3-20 karakter, hanya huruf/angka/underscore, dan dipakai di
leaderboard.

Semua endpoint ber-auth butuh header `Authorization: Bearer <token>`.
Endpoint admin menerima JWT milik user dengan `users.is_admin = true`, atau
header `x-admin-token` yang sama dengan `ADMIN_TOKEN` (fallback).

## Database

Memakai PostgreSQL sesuai `DATABASE_URL`. Koneksi internal Railway dan host
lokal otomatis tanpa SSL; host publik memakai SSL. Saat `NODE_ENV=production`
(atau `RUN_MIGRATIONS=true`), `schema.sql` dijalankan otomatis saat server
start — aman karena semua statement `IF NOT EXISTS`. Untuk mengisi data awal
di server tanpa CLI, set `RUN_SEED=true` sekali saat deploy.

```bash
npm run migrate   # manual
npm run seed      # manual (idempotent)
```

`npm run seed` membuat tiga akun demo saat development, lengkap dengan
username publik untuk leaderboard:

```
Admin          : @admin   | admin@today.demo / admin1234
Premium        : @premium | premium@today.demo / premium1234
Belum premium  : @siswa   | siswa@today.demo / siswa1234
```

Akun premium mendapat 12 attempt contoh yang tersebar di beberapa hari, plus
beberapa attempt untuk akun gratis dan `johndoe@gmail.com` agar leaderboard
tidak kosong. Riwayat akun demo di-reset setiap seed.

Akun demo dilewati saat `NODE_ENV=production` atau `SKIP_DEMO_USER=true`,
kecuali `SEED_DEMO_ACCOUNTS=true` (dipakai script `demo:local`).
Ganti/hapus akun demo sebelum produksi sungguhan.

## Catatan keamanan untuk produksi

- Ganti `JWT_SECRET` di `.env` dengan string acak yang panjang dan rahasia.
- `MIDTRANS_SERVER_KEY` hanya boleh ada di server; client key aman di frontend.
- Set `FRONTEND_URL` agar CORS dan redirect pembayaran mengarah ke domain benar.
- Jangan commit file `.env` ke git (sudah ada di `.gitignore`).
