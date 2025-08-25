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

ALTER TABLE application_life
ADD COLUMN insured_name TEXT,
ADD COLUMN writing_agent TEXT;

ALTER TABLE commission_life
ADD COLUMN insured_name TEXT,
ADD COLUMN writing_agent TEXT;

ALTER TABLE saved_life_orders
ADD COLUMN insured_name TEXT,
ADD COLUMN writing_agent TEXT;

ALTER TABLE application_annuity
ADD COLUMN insured_name TEXT,
ADD COLUMN writing_agent TEXT;

ALTER TABLE commission_annuity
ADD COLUMN insured_name TEXT,
ADD COLUMN writing_agent TEXT;

ALTER TABLE saved_annuity_orders
ADD COLUMN insured_name TEXT,
ADD COLUMN writing_agent TEXT;

-- Life: store as decimal multiplier. 1.00 = 100%
ALTER TABLE commission_life
  ADD COLUMN product_rate NUMERIC(6,4) NOT NULL DEFAULT 1.00;
ALTER TABLE application_life
  ADD COLUMN product_rate NUMERIC(6,4) NOT NULL DEFAULT 1.00;
ALTER TABLE saved_life_orders
  ADD COLUMN product_rate NUMERIC(6,4) NOT NULL DEFAULT 1.00;

-- Annuity: 0.06 = 6%
ALTER TABLE commission_annuity
  ADD COLUMN product_rate NUMERIC(6,4) NOT NULL DEFAULT 0.06;
ALTER TABLE application_annuity
  ADD COLUMN product_rate NUMERIC(6,4) NOT NULL DEFAULT 0.06;
ALTER TABLE saved_annuity_orders
  ADD COLUMN product_rate NUMERIC(6,4) NOT NULL DEFAULT 0.06;

UPDATE commission_life     SET product_rate = 1.00  WHERE product_rate IS NULL;
UPDATE application_life     SET product_rate = 1.00  WHERE product_rate IS NULL;
UPDATE saved_life_orders     SET product_rate = 1.00  WHERE product_rate IS NULL;
UPDATE commission_annuity  SET product_rate = 0.06  WHERE product_rate IS NULL;
UPDATE application_annuity  SET product_rate = 0.06  WHERE product_rate IS NULL;
UPDATE saved_annuity_orders  SET product_rate = 0.06  WHERE product_rate IS NULL;

UPDATE commission_life     SET product_rate = 100;
UPDATE application_life     SET product_rate = 100;
UPDATE saved_life_orders     SET product_rate = 100;
UPDATE commission_annuity  SET product_rate = 6;
UPDATE application_annuity  SET product_rate = 6;
UPDATE saved_annuity_orders  SET product_rate = 6;

-- =========================================
-- 1) Product Catalogs
-- =========================================

-- ===== Life product catalog =====
CREATE TABLE IF NOT EXISTS product_life (
  id SERIAL PRIMARY KEY,
  carrier_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  life_product_type TEXT,               -- e.g. IUL / WL / Term
  product_rate NUMERIC(7,3) NOT NULL,   -- % used for agent production/commission base
  fiso_rate    NUMERIC(7,3) NOT NULL,   -- % internal, confidential (carrier -> FISO)
  excess_rate  NUMERIC(7,3) NOT NULL DEFAULT 0,
  renewal_rate NUMERIC(7,3) NOT NULL DEFAULT 0
);

-- Ensure uniqueness by (carrier_name, product_name)
-- (Use an index so the script is idempotent.)
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_life_carrier_product
ON product_life (carrier_name, product_name);

-- ===== Annuity product catalog =====
CREATE TABLE IF NOT EXISTS product_annuity (
  id SERIAL PRIMARY KEY,
  carrier_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  age_bracket  TEXT,                    -- e.g. 'Ages 0-70' (nullable)
  product_rate NUMERIC(7,3) NOT NULL,   -- % agent production base (e.g. 6.000)
  fiso_rate    NUMERIC(7,3) NOT NULL,   -- % internal (e.g. 8.000)
  excess_rate  NUMERIC(7,3) NOT NULL DEFAULT 0,
  renewal_rate NUMERIC(7,3) NOT NULL DEFAULT 0
);

-- If you're on Postgres 15+, you can do this to treat NULLs as duplicates:
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_product_annuity_cpn
-- ON product_annuity (carrier_name, product_name, age_bracket NULLS NOT DISTINCT);

-- For broad compatibility (pre-15), use an expression index with COALESCE:
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_annuity_carrier_product_age
ON product_annuity (carrier_name, product_name, (COALESCE(age_bracket, '')));


-- =========================================
-- 2) Snapshot columns on application tables
--    (filled ONLY when the order is completed/distributed)
-- =========================================

-- Life applications
ALTER TABLE application_life
  ADD COLUMN IF NOT EXISTS product_rate        NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS fiso_rate           NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS excess_rate         NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS renewal_rate        NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS product_type_label  TEXT;      -- e.g. IUL/WL/Term (display label)

-- Annuity applications
ALTER TABLE application_annuity
  ADD COLUMN IF NOT EXISTS product_rate  NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS fiso_rate     NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS excess_rate   NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS renewal_rate  NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS age_bracket   TEXT;

ALTER TABLE saved_life_orders
  ADD COLUMN IF NOT EXISTS product_rate        NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS fiso_rate           NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS excess_rate         NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS renewal_rate        NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS product_type_label  TEXT;      -- e.g. IUL/WL/Term (display label)

-- Annuity applications
ALTER TABLE saved_annuity_orders
  ADD COLUMN IF NOT EXISTS product_rate  NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS fiso_rate     NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS excess_rate   NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS renewal_rate  NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS age_bracket   TEXT;


-- =========================================
-- 3) (Optional) snapshot columns on commission tables
--    if you want immutable copies post-distribution
-- =========================================

-- Life commissions
ALTER TABLE commission_life
  ADD COLUMN IF NOT EXISTS product_rate        NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS fiso_rate           NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS excess_rate         NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS renewal_rate        NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS product_type_label  TEXT;

-- Annuity commissions
ALTER TABLE commission_annuity
  ADD COLUMN IF NOT EXISTS product_rate  NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS fiso_rate     NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS excess_rate   NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS renewal_rate  NUMERIC(7,3),
  ADD COLUMN IF NOT EXISTS age_bracket   TEXT;


-- =========================================
-- 4) (Optional cleanup) If you previously created a bad UNIQUE constraint
--    with COALESCE inside the table definition, drop it here first.
--    Replace <bad_constraint_name> with the real name if needed.
-- =========================================
-- ALTER TABLE product_annuity DROP CONSTRAINT IF EXISTS <bad_constraint_name>;

-- Clean up any old expression index you might have created previously
DROP INDEX IF EXISTS ux_product_annuity_carrier_product_age;

-- Make sure the tables exist
CREATE TABLE IF NOT EXISTS product_life (
  id SERIAL PRIMARY KEY,
  carrier_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  life_product_type TEXT,
  product_rate NUMERIC(7,3) NOT NULL,
  fiso_rate    NUMERIC(7,3) NOT NULL,
  excess_rate  NUMERIC(7,3) NOT NULL DEFAULT 0,
  renewal_rate NUMERIC(7,3) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_annuity (
  id SERIAL PRIMARY KEY,
  carrier_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  age_bracket  TEXT,
  product_rate NUMERIC(7,3) NOT NULL,
  fiso_rate    NUMERIC(7,3) NOT NULL,
  excess_rate  NUMERIC(7,3) NOT NULL DEFAULT 0,
  renewal_rate NUMERIC(7,3) NOT NULL DEFAULT 0
);

-- Add a generated column to normalize NULL/blank brackets
ALTER TABLE product_annuity
  ADD COLUMN IF NOT EXISTS age_bracket_norm TEXT
  GENERATED ALWAYS AS (COALESCE(age_bracket, '')) STORED;

-- Add proper UNIQUE constraints that ON CONFLICT can target
DO $$
BEGIN
  ALTER TABLE product_life
    ADD CONSTRAINT ux_product_life UNIQUE (carrier_name, product_name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE product_annuity
    ADD CONSTRAINT ux_product_annuity UNIQUE (carrier_name, product_name, age_bracket_norm);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

WITH v (carrier_name, product_name, age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate) AS (
  VALUES
  -- Athene
  ('Athene','SPIA I',NULL,2.50,3.25,0,0),
  ('Athene','Athene MaxRate MYG 3 - Option 1','Ages 0-70',1.15,1.50,0,0),
  ('Athene','Athene MaxRate MYG 5 - Option 1','Ages 0-70',1.50,2.25,0,0),
  ('Athene','Athene MaxRate MYG 7 - Option 1','Ages 0-70',1.75,2.50,0,0),
  ('Athene','Athene Ascent Pro 10 Bonus Option 1','Ages 0-70',6.00,7.75,0,0),
  ('Athene','Performance Elite 7 Option 1','Ages 0-70',4.25,5.75,0,0),
  ('Athene','Performance Elite 10 Option 1','Ages 0-70',6.00,8.00,0,0),
  ('Athene','Performance Elite 15 Option 1','Ages 0-70',6.00,8.00,0,0),
  ('Athene','Athene Agility 7 Option 1','Ages 0-70',4.00,5.25,0,0),
  ('Athene','Athene Agility 10 Option 1','Ages 0-70',6.00,7.25,0,0),

  -- Allianz
  ('Allianz','Allianz 360 Option A','Ages 0-75',6.25,8.25,0,0),
  ('Allianz','Allianz Benefit Control Option A','Ages 0-75',6.25,8.25,0,0),
  ('Allianz','Allianz 222 Option A','Ages 0-75',6.25,8.25,0,0),
  ('Allianz','Allianz Accumulation Advantage Option A','Ages 0-75',6.25,8.25,0,0),
  ('Allianz','Allianz Core Income 7 Option A','Ages 0-75',4.75,6.25,0,0),

  -- Nationwide
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 8 - No Trail Option','Ages 0-70',4.00,5.50,0,0),
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 9 - No Trail Option','Ages 0-70',6.25,8.25,0,0),
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 9 - Option 1','Ages 0-70',2.25,3.00,0,0),
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 10 - No Trail Option','Ages 0-70',5.50,7.25,0,0),
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 10 - Option 1','Ages 0-70',1.25,1.75,0,0),
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 12 - No Trail Option','Ages 0-70',6.50,9.00,0,0),
  ('Nationwide','Nationwide New Heights Select Fixed Index Annuity 12 - Option 1','Ages 0-70',2.00,2.75,0,0),

  -- LSW - National Life  (note: duplicates exist; we'll dedupe below)
  ('LSW - National Life','SecurePlus Forte','Ages 0-55',8.75,11.50,0,0),
  ('LSW - National Life','SecurePlus Forte','Ages 56-60',6.75,9.00,0,0),
  ('LSW - National Life','SecurePlus Forte','Ages 61-70',5.25,7.00,0,0),
  ('LSW - National Life','SecurePlus Forte','Ages 0-55',7.25,9.50,0,0),  -- duplicate key
  ('LSW - National Life','SecurePlus Forte','Ages 56-70',6.25,8.25,0,0),
  ('LSW - National Life','FIT Select Income*','Ages 0-70',5.25,7.00,0,0),
  ('LSW - National Life','FIT Select Income*','Ages 71-75',3.75,5.00,0,0),
  ('LSW - National Life','FIT Secure Growth*','Ages 0-70',5.25,7.00,0,0),
  ('LSW - National Life','FIT Secure Growth*','Ages 71-75',3.75,5.00,0,0),
  ('LSW - National Life','FIT Secure Growth*','Ages 76-80',2.50,3.25,0,0)
),
dedup AS (
  SELECT DISTINCT ON (carrier_name, product_name, COALESCE(age_bracket,''))
         carrier_name, product_name, age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate
  FROM v
  -- Choose which row to keep when duplicates exist: here we pick the higher product_rate
  ORDER BY carrier_name, product_name, COALESCE(age_bracket,''), product_rate DESC
)
INSERT INTO product_annuity
  (carrier_name, product_name, age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate)
SELECT
  carrier_name, product_name, age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate
FROM dedup
ON CONFLICT ON CONSTRAINT ux_product_annuity
DO UPDATE SET
  product_rate = EXCLUDED.product_rate,
  fiso_rate    = EXCLUDED.fiso_rate,
  excess_rate  = EXCLUDED.excess_rate,
  renewal_rate = EXCLUDED.renewal_rate;

WITH v (carrier_name, product_name, life_product_type, product_rate, fiso_rate, excess_rate, renewal_rate) AS (
  VALUES
  -- Allianz
  ('Allianz','Allianz Accumulator IUL','IUL',100,140,3,3),

  -- Ameritas
  ('Ameritas','FLX Living Benefits IUL','IUL',100,115,0,0),

  -- F&G Life
  ('F&G Life','Pathsetter (Issue Ages 18-80)','IUL',100,135,2.5,4),

  -- LSW / National Life
  ('LSW - National Life','Level Term 10 w Living Benefits','Term',60,85,0,0),
  ('LSW - National Life','Level Term 15 w Living Benefits','Term',60,85,0,0),
  ('LSW - National Life','Level Term 20 w Living Benefits','Term',70,105,0,0),
  ('LSW - National Life','Level Term 30 w Living Benefits','Term',70,105,0,0),
  ('LSW - National Life','FlexLife II','IUL',100,120,3.5,3.5),
  ('LSW - National Life','PeakLife (1mm minimum face amount)','IUL',100,120,3.5,3.5),
  ('LSW - National Life','Summit Life (1mm minimum face amount)','IUL',100,120,3.5,3.5),
  ('LSW - National Life','SurvivorLife','SIUL',100,120,3.5,3.5),

  -- Lincoln Financial Group
  ('Lincoln Financial Group','Lincoln WealthAccelerate IUL (instant decision)','IUL',90,115,4,3),
  ('Lincoln Financial Group','Lincoln WealthAccumulate 2 IUL','IUL',90,110,3.5,3),
  ('Lincoln Financial Group','Lincoln WealthPreserve SIUL','SIUL',90,110,3.5,3),

  -- Mass Mutual
  ('Mass Mutual','Universal Life Guard 6','UL',55,75,2,6),
  ('Mass Mutual','Survivorship Universal Life Guard 6','SUL',55,75,2,6),
  ('Mass Mutual','Whole Life (WL10, WL15, WL20, WL65, WL100)','WL',50,70,0,0),
  ('Mass Mutual','Survivorship Whole Life Legacy 100','SWL',50,70,0,0),

  -- Nationwide
  ('Nationwide','IUL Accumulator II','IUL',100,115,2,1.5),

  -- Symetra Life Insurance Company
  ('Symetra Life Insurance Company','Symetra SwiftTerm 10 & 15 Year (instant decision)','Term',70,105,0,0),
  ('Symetra Life Insurance Company','Symetra SwiftTerm 20 & 30 Year (instant decision)','Term',100,125,0,0),
  ('Symetra Life Insurance Company','Symetra Accumulator Ascent IUL 4.0','IUL',117.64,130,4,1.5)
)
INSERT INTO product_life
  (carrier_name, product_name, life_product_type, product_rate, fiso_rate, excess_rate, renewal_rate)
SELECT * FROM v
ON CONFLICT ON CONSTRAINT ux_product_life
DO UPDATE SET
  life_product_type = EXCLUDED.life_product_type,
  product_rate      = EXCLUDED.product_rate,
  fiso_rate         = EXCLUDED.fiso_rate,
  excess_rate       = EXCLUDED.excess_rate,
  renewal_rate      = EXCLUDED.renewal_rate;

-- 1) Add agent-specific excess/renewal columns (life only)
ALTER TABLE product_life
  ADD COLUMN IF NOT EXISTS agent_excess_rate   numeric(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS agent_renewal_rate  numeric(10,2) DEFAULT 0 NOT NULL;

-- 2) Update rows with your new rates
-- Allianz
UPDATE product_life
SET agent_excess_rate = 2, agent_renewal_rate = 2, excess_rate = 3, renewal_rate = 3
WHERE carrier_name = 'Allianz' AND product_name = 'Allianz Accumulator IUL';

-- Ameritas
UPDATE product_life
SET agent_excess_rate = 0, agent_renewal_rate = 0, excess_rate = COALESCE(excess_rate,0), renewal_rate = COALESCE(renewal_rate,0)
WHERE carrier_name = 'Ameritas' AND product_name = 'FLX Living Benefits IUL';

-- F&G Life
UPDATE product_life
SET agent_excess_rate = 1.5, agent_renewal_rate = 2, excess_rate = 2.5, renewal_rate = 4
WHERE carrier_name = 'F&G Life' AND product_name = 'Pathsetter (Issue Ages 18-80)';

-- LSW - National Life (names in your DB use this exact carrier label)
UPDATE product_life
SET agent_excess_rate = 0, agent_renewal_rate = 0, excess_rate = COALESCE(excess_rate,0), renewal_rate = COALESCE(renewal_rate,0)
WHERE carrier_name = 'LSW - National Life' AND product_name IN (
  'Level Term 10 w Living Benefits',
  'Level Term 15 w Living Benefits',
  'Level Term 20 w Living Benefits',
  'Level Term 30 w Living Benefits',
  'Whole Life (WL10, WL15, WL20, WL65, WL100)',
  'Survivorship Whole Life Legacy 100'
);

-- FlexLife/PeakLife/Summit/SurvivorLife (product names in your DB include parentheses; match with ILIKE)
UPDATE product_life
SET agent_excess_rate = 2, agent_renewal_rate = 2, excess_rate = 3.5, renewal_rate = 3.5
WHERE carrier_name = 'LSW - National Life' AND (
  product_name = 'FlexLife II'
  OR product_name ILIKE 'PeakLife%'
  OR product_name ILIKE 'Summit Life%'
  OR product_name = 'SurvivorLife'
);

-- Lincoln Financial Group
UPDATE product_life
SET agent_excess_rate = 2, agent_renewal_rate = 2, excess_rate = 4, renewal_rate = 3
WHERE carrier_name = 'Lincoln Financial Group' AND product_name = 'Lincoln WealthAccelerate IUL (instant decision)';

UPDATE product_life
SET agent_excess_rate = 2, agent_renewal_rate = 2, excess_rate = 3.5, renewal_rate = 3
WHERE carrier_name = 'Lincoln Financial Group' AND product_name = 'Lincoln WealthAccumulate 2 IUL';

UPDATE product_life
SET agent_excess_rate = 2, agent_renewal_rate = 2, excess_rate = 3.5, renewal_rate = 3
WHERE carrier_name = 'Lincoln Financial Group' AND product_name = 'Lincoln WealthPreserve SIUL';

-- Mass Mutual
UPDATE product_life
SET agent_excess_rate = 1, agent_renewal_rate = 2, excess_rate = 2, renewal_rate = 6
WHERE carrier_name = 'Mass Mutual' AND product_name = 'Universal Life Guard 6';

UPDATE product_life
SET agent_excess_rate = 1, agent_renewal_rate = 2, excess_rate = 2, renewal_rate = 6
WHERE carrier_name = 'Mass Mutual' AND product_name = 'Survivorship Universal Life Guard 6';

UPDATE product_life
SET agent_excess_rate = 0, agent_renewal_rate = 0, excess_rate = COALESCE(excess_rate,0), renewal_rate = COALESCE(renewal_rate,0)
WHERE carrier_name = 'Mass Mutual' AND product_name = 'Whole Life (WL10, WL15, WL20, WL65, WL100)';

UPDATE product_life
SET agent_excess_rate = 0, agent_renewal_rate = 0, excess_rate = COALESCE(excess_rate,0), renewal_rate = COALESCE(renewal_rate,0)
WHERE carrier_name = 'Mass Mutual' AND product_name = 'Survivorship Whole Life Legacy 100';

-- Nationwide
UPDATE product_life
SET agent_excess_rate = 1, agent_renewal_rate = 0.75, excess_rate = 2, renewal_rate = 1.5
WHERE carrier_name = 'Nationwide' AND product_name = 'IUL Accumulator II';

-- Symetra Life Insurance Company
UPDATE product_life
SET agent_excess_rate = 0, agent_renewal_rate = 0, excess_rate = COALESCE(excess_rate,0), renewal_rate = COALESCE(renewal_rate,0)
WHERE carrier_name = 'Symetra Life Insurance Company' AND product_name IN (
  'Symetra SwiftTerm 10 & 15 Year (instant decision)',
  'Symetra SwiftTerm 20 & 30 Year (instant decision)'
);

UPDATE product_life
SET agent_excess_rate = 2, agent_renewal_rate = 0.75, excess_rate = 4, renewal_rate = 1.5
WHERE carrier_name = 'Symetra Life Insurance Company' AND product_name = 'Symetra Accumulator Ascent IUL 4.0';
