# TO-Day API (backend)

Backend Node.js + Express untuk aplikasi TO-Day, dengan database SQLite
(via `better-sqlite3`).

## Instalasi

```bash
npm install
cp .env.example .env
npm run seed    # buat database, isi soal/tryout, dan akun demo
npm run dev     # jalan di http://localhost:4000 dengan auto-restart saat file berubah
```

Untuk produksi (tanpa auto-restart): `npm start`.

## Struktur

```
src/
├── index.js              # entry point, setup Express
├── db/
│   ├── schema.sql         # skema tabel
│   ├── index.js            # koneksi database + inisialisasi skema
│   └── seed.js              # isi data awal (soal, tryout, akun demo)
├── middleware/
│   └── auth.js              # verifikasi JWT
└── routes/
    ├── auth.js               # register, login, profil
    ├── tryouts.js             # daftar tryout, ambil soal
    ├── attempts.js             # submit jawaban, lihat hasil
    ├── leaderboard.js           # peringkat skor
    ├── stats.js                  # statistik progres belajar
    └── payments.js                 # simulasi pembayaran (lihat catatan di dalam file)
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
| GET | `/api/payments/price` | ✓ | Harga & metode pembayaran |
| POST | `/api/payments` | ✓ | Buat transaksi (simulasi) |
| POST | `/api/payments/:id/confirm` | ✓ | Konfirmasi pembayaran, aktifkan premium |
| GET | `/api/payments/history` | ✓ | Riwayat transaksi |

Semua endpoint ber-auth butuh header `Authorization: Bearer <token>`.

## Database

Default memakai SQLite, file tersimpan di `data/to-day.sqlite3` (dibuat
otomatis, diabaikan oleh git). Untuk reset database ke kondisi awal:

```bash
rm -f data/to-day.sqlite3 data/to-day.sqlite3-shm data/to-day.sqlite3-wal
npm run seed
```

## Catatan keamanan untuk produksi

- Ganti `JWT_SECRET` di `.env` dengan string acak yang panjang dan rahasia.
- Jangan commit file `.env` ke git (sudah ada di `.gitignore`).
- Pertimbangkan pindah ke PostgreSQL/MySQL jika aplikasi akan menerima banyak
  pengguna bersamaan — SQLite cukup untuk pengembangan dan skala kecil.
