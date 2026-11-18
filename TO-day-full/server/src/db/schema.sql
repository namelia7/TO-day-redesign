-- Skema database TO-Day (PostgreSQL / Supabase)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_until TIMESTAMP,            -- tanggal kapan premium berakhir (NULL = tidak aktif)
  school TEXT,
  ptn TEXT,
  prodi TEXT,
  passing_grade INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
  type TEXT NOT NULL CHECK (type IN ('utbk', 'subtest')),
  subtest_code TEXT REFERENCES subtests(code),
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  description TEXT
);

CREATE TABLE IF NOT EXISTS tryout_questions (
  tryout_id TEXT NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (tryout_id, question_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tryout_id TEXT NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  answers TEXT NOT NULL,              -- JSON object { questionId: answer }
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  time_used_seconds INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Transaksi pembayaran. status: pending -> paid/failed.
-- provider_ref menyimpan id transaksi dari payment gateway (kosong di mode simulasi).
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL,               -- 'QRIS' | 'GoPay' | 'Transfer Bank'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  provider TEXT NOT NULL DEFAULT 'simulated', -- 'simulated' | 'midtrans' | 'xendit' dst
  provider_ref TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_tryout ON attempts(tryout_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
