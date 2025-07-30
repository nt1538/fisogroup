DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS life_orders;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS annuity_orders;

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
CREATE TABLE annuity_orders (
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

ALTER TABLE life_orders
ADD COLUMN chart_percent NUMERIC,
ADD COLUMN level_percent NUMERIC,
ADD COLUMN parent_order_id INT;

CREATE TABLE annuity_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company TEXT,
  policy_number TEXT,
  amount NUMERIC,
  state TEXT,
  date TIMESTAMP DEFAULT NOW(),
  order_type TEXT,
  commission_percent NUMERIC,
  commission_amount NUMERIC,
  chart_percent NUMERIC,
  level_percent NUMERIC,
  parent_order_id INTEGER REFERENCES annuity_orders(id) ON DELETE CASCADE,
  application_status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS agent_fiso TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS national_producer_number TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS hierarchy_level TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS split_percent NUMERIC;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS carrier_name TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS product_name_carrier TEXT;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS application_date DATE;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS face_amount NUMERIC;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS target_premium NUMERIC;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS initial_premium NUMERIC;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS commission_from_carrier NUMERIC;
ALTER TABLE life_orders ADD COLUMN IF NOT EXISTS mra_status TEXT;

ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS agent_fiso TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS national_producer_number TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS hierarchy_level TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS split_percent NUMERIC;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS carrier_name TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS product_name_carrier TEXT;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS application_date DATE;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS face_amount NUMERIC;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS target_premium NUMERIC;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS initial_premium NUMERIC;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS commission_from_carrier NUMERIC;
ALTER TABLE annuity_orders ADD COLUMN IF NOT EXISTS mra_status TEXT;

ALTER TABLE life_orders ADD COLUMN order_type TEXT;

UPDATE life_orders
SET commission_percent = NULL,
    commission_amount = NULL
WHERE commission_percent = 'NaN' OR commission_amount = 'NaN';

ALTER TABLE life_orders
ALTER COLUMN commission_percent TYPE NUMERIC USING commission_percent::NUMERIC;

ALTER TABLE users
ADD COLUMN hierarchy_level VARCHAR(50);

UPDATE users
SET hierarchy_level = CASE
  WHEN level_percent >= 100 THEN 'Vice President'
  WHEN level_percent >= 95 THEN 'Agency 3'
  WHEN level_percent >= 90 THEN 'Agency 2'
  WHEN level_percent >= 85 THEN 'Agency 1'
  WHEN level_percent >= 80 THEN 'Level C'
  WHEN level_percent >= 750 THEN 'Level B'
  ELSE 'Level A'
END
WHERE hierarchy_level IS NULL OR hierarchy_level = '';

CREATE TABLE application_annuity (
  LIKE annuity_orders INCLUDING ALL
);

CREATE TABLE commission_annuity (
  LIKE annuity_orders INCLUDING ALL
);

CREATE TABLE saved_annuity_orders (
  LIKE annuity_orders INCLUDING ALL
);

CREATE TABLE application_life (
  LIKE life_orders INCLUDING ALL
);

CREATE TABLE commission_life (
  LIKE life_orders INCLUDING ALL
);

CREATE TABLE saved_life_orders (
  LIKE life_orders INCLUDING ALL
);
ALTER TABLE application_annuity ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE commission_annuity ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE saved_annuity_orders ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE application_life ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE commission_life ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE saved_life_orders ADD COLUMN IF NOT EXISTS comment TEXT;

ALTER TABLE application_life
ADD COLUMN split_percent INT DEFAULT 100,
ADD COLUMN split_with_id VARCHAR(36);

ALTER TABLE commission_life
ADD COLUMN split_percent INT DEFAULT 100,
ADD COLUMN split_with_id VARCHAR(36);

ALTER TABLE saved_life_orders
ADD COLUMN split_percent INT DEFAULT 100,
ADD COLUMN split_with_id VARCHAR(36);


ALTER TABLE application_annuity
ADD COLUMN split_percent INT DEFAULT 100,
ADD COLUMN split_with_id VARCHAR(36);

ALTER TABLE commission_annuity
ADD COLUMN split_percent INT DEFAULT 100,
ADD COLUMN split_with_id VARCHAR(36);

ALTER TABLE saved_annuity_orders
ADD COLUMN split_percent INT DEFAULT 100,
ADD COLUMN split_with_id VARCHAR(36);
