// db/index.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hierarchy_db',
  password: process.env.DB_PASSWORD || 'Access121',
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
