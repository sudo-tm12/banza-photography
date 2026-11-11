-- BANZA Photography API: accounts, bookings, model applications, availability and settings.

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client',          -- client | admin (Mr Banza and the PA)
  created_at TEXT NOT NULL,
  last_login TEXT
);

-- One pending sign-in code per email (hashed), 10 minutes, 5 tries.
CREATE TABLE otp_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Sessions: only the SHA-256 of the token is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE shoot_types (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  price_note TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  shoot_type_id INTEGER NOT NULL REFERENCES shoot_types(id),
  date TEXT NOT NULL,                           -- YYYY-MM-DD (South African time)
  slot TEXT NOT NULL,                           -- morning | midday | afternoon | golden | evening
  location TEXT NOT NULL,
  distance_band TEXT NOT NULL,
  people INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | confirmed | completed | declined | cancelled
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  pa_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX bookings_date ON bookings(date, status);
CREATE INDEX bookings_user ON bookings(user_id);
-- A slot can only be held by one live booking: double bookings are impossible at the database level.
CREATE UNIQUE INDEX bookings_slot_live ON bookings(date, slot) WHERE status IN ('pending', 'confirmed');

CREATE TABLE applications (
  id INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  height_cm INTEGER,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  social TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL,
  interests TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',            -- JSON array of KV keys
  status TEXT NOT NULL DEFAULT 'new',           -- new | contacted | shortlisted | accepted | declined
  pa_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX applications_status ON applications(status, created_at);
CREATE INDEX applications_user ON applications(user_id);

CREATE TABLE blocked_dates (
  date TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT ''
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE rate_events (
  action TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX rate_events_lookup ON rate_events(action, ip_hash, created_at);

-- Local testing only (MAIL_TRANSPORT = "outbox"): emails land here instead of being sent.
CREATE TABLE outbox (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL
);

INSERT INTO shoot_types (slug, name, description, duration, price_note, sort) VALUES
  ('portrait', 'Portrait shoot', 'Personal, professional or creative portraits.', '1–2 hours', 'Hourly rate, quoted on confirmation', 1),
  ('birthday', 'Birthday party', 'Coverage of your celebration, from setup to cake.', '2–4 hours', 'Hourly rate, quoted on confirmation', 2),
  ('event', 'Event', 'Matric farewells, functions and gatherings.', '2–6 hours', 'Hourly rate, quoted on confirmation', 3),
  ('graduation', 'Graduation', 'Graduation portraits and ceremonies, gowns and caps available.', '1–3 hours', 'Quoted on confirmation', 4);

INSERT INTO settings (key, value) VALUES
  ('pa_emails', 'banzaphotography@gmail.com'),
  ('admin_emails', 'banzaphotography@gmail.com'),
  ('instagram', 'https://www.instagram.com/banza_photography/'),
  ('tiktok', ''),
  ('facebook', ''),
  ('whatsapp', ''),
  ('lead_days', '2'),
  ('window_days', '120'),
  ('working_days', '0123456');
