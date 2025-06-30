const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // adjust if your DB connection file is different
const router = express.Router();

const ACCESS_CODE = 'Access121'; // Hardcoded for now, move to env in production

// ==============================
// Register Route
// ==============================
function getHierarchyLevel(percent) {
  if (percent >= 100) return 'Vice President';
  if (percent >= 95) return 'Agency 3';
  if (percent >= 90) return 'Agency 2';
  if (percent >= 85) return 'Agency 1';
  if (percent >= 80) return 'Level C';
  if (percent >= 75) return 'Level B';
  return 'Level A';
}

async function generateEmployeeId(stateAbbr) {
  const prefix = stateAbbr.toUpperCase();
  const query = `
    SELECT custom_employee_id FROM users
    WHERE state = $1 AND custom_employee_id IS NOT NULL
    ORDER BY custom_employee_id DESC
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [stateAbbr]);

  if (rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastId = rows[0].custom_employee_id;
  const number = parseInt(lastId.replace(prefix, '')) + 1;
  return `${prefix}${String(number).padStart(4, '0')}`;
}

router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password, // SHA-256 hash from frontend
    introducer_id,
    state,
    access_code
  } = req.body;

  if (access_code !== ACCESS_CODE) {
    return res.status(403).json({ error: 'Invalid access code' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const percent = 70;
    const stateUpper = state?.toUpperCase();
    const hierarchy_level = getHierarchyLevel(percent);

    const id = await generateEmployeeId(stateUpper);

    await pool.query(
      `INSERT INTO users (id, name, email, password, introducer_id, state, hierarchy_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ id,
        name,
        email,
        hashedPassword,
        introducer_id || null,
        state?.toUpperCase() || null,
        hierarchy_level
      ]
    );

    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ==============================
// Login Route
// ==============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body; // password is SHA-256 from frontend

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // password = SHA256 from frontend → bcrypt.compare(hash, user.password)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        state: user.state,
        level_percent: user.level_percent,
        introducer_id: user.introducer_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


