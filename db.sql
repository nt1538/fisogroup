DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS life_orders;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS annuities;

-- USERS TABLE (with state info)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  state TEXT NOT NULL, -- e.g. 'NY', 'CA', etc.
  is_admin BOOLEAN DEFAULT FALSE,
  introducer_id INTEGER REFERENCES users(id),
  level_percent INTEGER DEFAULT 70,
  total_earnings NUMERIC DEFAULT 0
);

-- LIFE ORDERS TABLE (Matches full frontend display)
CREATE TABLE life_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  agent_fiso TEXT,
  last_name TEXT,
  first_name TEXT,
  national_producer_number TEXT,
  license_number TEXT,
  hierarchy_level TEXT,
  commission_percent NUMERIC,
  split_percent NUMERIC,
  carrier_name TEXT,
  product_type TEXT,
  product_name_carrier TEXT,
  application_date DATE,
  policy_number TEXT,
  face_amount NUMERIC,
  target_premium NUMERIC,
  initial_premium NUMERIC,
  commission_from_carrier NUMERIC,
  application_status TEXT,
  mra_status TEXT,
  status TEXT DEFAULT 'In Progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- APPLICATIONS TABLE
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_type TEXT,
  carrier_name TEXT,
  product_name_carrier TEXT,
  application_date DATE,
  policy_number TEXT,
  face_amount NUMERIC,
  target_premium NUMERIC,
  initial_premium NUMERIC,
  commission_from_carrier NUMERIC,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENTS TABLE
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UPLOADS TABLE
CREATE TABLE uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  file_type TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ANNUITIES TABLE (Matches full frontend display)
CREATE TABLE annuities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  agent_fiso TEXT,
  last_name TEXT,
  first_name TEXT,
  national_producer_number TEXT,
  license_number TEXT,
  hierarchy_level TEXT,
  commission_percent NUMERIC,
  split_percent NUMERIC,
  carrier_name TEXT,
  product_type TEXT,
  product_name_carrier TEXT,
  application_date DATE,
  policy_number TEXT,
  initial_premium NUMERIC,
  commission_from_carrier NUMERIC,
  application_status TEXT,
  mra_status TEXT,
  status TEXT DEFAULT 'In Progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);