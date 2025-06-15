DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS life_orders;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS annuities_orders;

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
CREATE TABLE annuities_orders (
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

ALTER TABLE users
ADD COLUMN commission NUMERIC DEFAULT 0,
ADD COLUMN profit NUMERIC DEFAULT 0;

-- 更新 orders 表，增加总佣金与用户个人佣金字段
ALTER TABLE life_orders
ADD COLUMN commission_amount NUMERIC,
ADD COLUMN level_commission NUMERIC;

CREATE TABLE commission_chart (
  id SERIAL PRIMARY KEY,
  title TEXT,
  min_amount NUMERIC,
  max_amount NUMERIC,
  commission_percent INTEGER
);

INSERT INTO commission_chart (title, min_amount, max_amount, commission_percent) VALUES
('Level A', 0, 29999.99, 70),
('Level B', 30000, 59999.99, 75),
('Level C', 60000, 249999.99, 80),
('Agency1', 250000, 499999.99, 85),
('Agency2', 500000, 999999.99, 90),
('Agency3', 1000000, 1999999.99, 95),
('Vice President', 2000000, 999999999, 100);