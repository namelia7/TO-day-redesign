-- Skema database TO-Day
-- SQLite dipakai supaya proyek ini bisa langsung jalan tanpa instalasi server
-- database terpisah. Untuk produksi skala besar, skema ini bisa dipindah ke
-- PostgreSQL/MySQL hampir tanpa perubahan (tinggal sesuaikan tipe data
-- AUTOINCREMENT / SERIAL dan TIMESTAMP).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_premium INTEGER NOT NULL DEFAULT 0,
  premium_until TEXT,                 -- tanggal ISO kapan premium berakhir (NULL = tidak aktif)
  school TEXT,
  ptn TEXT,
  prodi TEXT,
  passing_grade INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subtests (
  code TEXT PRIMARY KEY,              -- 'PU', 'PM', 'BIND', 'BING'
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subtest_code TEXT NOT NULL REFERENCES subtests(code),
  stem TEXT NOT NULL,
  choices TEXT,                       -- JSON array string, NULL untuk isian singkat
  answer TEXT NOT NULL,               -- index (string angka) untuk pilihan ganda, atau teks jawaban
  explain TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tryouts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,                 -- 'utbk' | 'subtest'
  subtest_code TEXT REFERENCES subtests(code),
  is_premium INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS tryout_questions (
  tryout_id TEXT NOT NULL REFERENCES tryouts(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  position INTEGER NOT NULL,
  PRIMARY KEY (tryout_id, question_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  tryout_id TEXT NOT NULL REFERENCES tryouts(id),
  answers TEXT NOT NULL,              -- JSON object { questionId: answer }
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  time_used_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transaksi pembayaran. status: pending -> paid/failed.
-- provider_ref menyimpan id transaksi dari payment gateway (kosong di mode simulasi).
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,               -- 'QRIS' | 'GoPay' | 'Transfer Bank'
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'simulated', -- 'simulated' | 'midtrans' | 'xendit' dst
  provider_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_tryout ON attempts(tryout_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
