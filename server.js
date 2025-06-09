// Updated Express.js backend for two order tables: life_orders and annuity_orders
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hierarchy_db',
    password: process.env.DB_PASSWORD || 'Access121',
    port: process.env.DB_PORT || 5432,
    ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected"))
    .catch(err => console.error("❌ Database Connection Error", err));

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY total_earnings DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userQuery.rows.length === 0 || userQuery.rows[0].password !== password) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const user = userQuery.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, "your_secret_key", { expiresIn: "1h" });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, is_admin: user.is_admin, total_earnings: user.total_earnings } });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/orders/life', async (req, res) => {
    try {
        const status = req.query.status;
        const query = status ? 'SELECT * FROM life_orders WHERE application_status ILIKE $1 ORDER BY application_date DESC' : 'SELECT * FROM life_orders ORDER BY application_date DESC';
        const result = await pool.query(query, status ? [`%${status}%`] : []);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/annuity', async (req, res) => {
    try {
        const status = req.query.status;
        const query = status ? 'SELECT * FROM annuity_orders WHERE application_status ILIKE $1 ORDER BY application_date DESC' : 'SELECT * FROM annuity_orders ORDER BY application_date DESC';
        const result = await pool.query(query, status ? [`%${status}%`] : []);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/api/employee/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const userQuery = await pool.query("SELECT id, name, role, total_earnings, current_profit FROM users WHERE id = $1", [userId]);
        const lifeOrders = await pool.query("SELECT * FROM life_orders WHERE user_id = $1 ORDER BY application_date DESC", [userId]);
        const annuityOrders = await pool.query("SELECT * FROM annuity_orders WHERE user_id = $1 ORDER BY application_date DESC", [userId]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json({ user: userQuery.rows[0], lifeOrders: lifeOrders.rows, annuityOrders: annuityOrders.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/org-chart/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      WITH RECURSIVE employee_tree AS (
        SELECT id, name, role, total_earnings, current_profit, introducer_id
        FROM users
        WHERE id = $1
        UNION ALL
        SELECT u.id, u.name, u.role, u.total_earnings, u.current_profit, u.introducer_id
        FROM users u
        INNER JOIN employee_tree et ON u.introducer_id = et.id
      )
      SELECT * FROM employee_tree WHERE id != $1
    `, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organization chart' });
  }
});


app.post('/api/admin/add-user', async (req, res) => {
    const { name, email, password, role, comp_level, introducer_id } = req.body;
    const adminId = req.headers['admin-id'];
    try {
        const adminCheck = await pool.query("SELECT is_admin FROM users WHERE id = $1", [adminId]);
        if (!adminCheck.rows[0]?.is_admin) return res.status(403).json({ error: "Unauthorized" });
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, comp_level, total_earnings, current_profit, introducer_id) VALUES ($1, $2, $3, $4, $5, 0, 0, $6) RETURNING *",
            [name, email, password, role, comp_level, introducer_id]
        );
        res.json({ message: "User added", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const router = express.Router();

const getEarningsData = async (userId) => {
    const result = { ytdEarnings: 0, rollingEarnings: 0, termEarnings: [] };
    const lifeYTD = await pool.query(`SELECT SUM(commission_from_carrier) AS total FROM life_orders WHERE user_id = $1 AND EXTRACT(YEAR FROM application_date) = EXTRACT(YEAR FROM CURRENT_DATE)`, [userId]);
    const annuityYTD = await pool.query(`SELECT SUM(commission_from_carrier) AS total FROM annuity_orders WHERE user_id = $1 AND EXTRACT(YEAR FROM application_date) = EXTRACT(YEAR FROM CURRENT_DATE)`, [userId]);
    result.ytdEarnings = (lifeYTD.rows[0].total || 0) + (annuityYTD.rows[0].total || 0);

    const lifeRolling = await pool.query(`SELECT SUM(commission_from_carrier) AS total FROM life_orders WHERE user_id = $1 AND application_date >= CURRENT_DATE - INTERVAL '12 months'`, [userId]);
    const annuityRolling = await pool.query(`SELECT SUM(commission_from_carrier) AS total FROM annuity_orders WHERE user_id = $1 AND application_date >= CURRENT_DATE - INTERVAL '12 months'`, [userId]);
    result.rollingEarnings = (lifeRolling.rows[0].total || 0) + (annuityRolling.rows[0].total || 0);

    const termQuery = `SELECT 
        date_trunc('quarter', application_date) AS period_start,
        date_trunc('quarter', application_date) + interval '3 month - 1 day' AS period_end,
        SUM(commission_from_carrier) AS earnings
      FROM (
        SELECT application_date, commission_from_carrier FROM life_orders WHERE user_id = $1
        UNION ALL
        SELECT application_date, commission_from_carrier FROM annuity_orders WHERE user_id = $1
      ) AS all_orders
      GROUP BY 1, 2
      ORDER BY 1 DESC
      LIMIT 4`;
    const termRes = await pool.query(termQuery, [userId]);
    result.termEarnings = termRes.rows;

    return result;
};

router.get('/me/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const earnings = await getEarningsData(userId);
        res.json({
            user: userRes.rows[0],
            ytdEarnings: parseFloat(earnings.ytdEarnings),
            rollingEarnings: parseFloat(earnings.rollingEarnings),
            termEarnings: earnings.termEarnings
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.use('/api', router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}/api`);
});

