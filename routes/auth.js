const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // adjust if your DB connection file is different
const router = express.Router();

const ACCESS_CODE = 'Access121'; // Hardcoded for now, move to env in production

// ==============================
// Register Route
// ==============================
router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password, // SHA-256 hash from frontend
    introducer_id,
    state,
    level_percent,
    access_code
  } = req.body;

  if (access_code !== ACCESS_CODE) {
    return res.status(403).json({ error: 'Invalid access code' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, email, password, introducer_id, state, level_percent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        name,
        email,
        hashedPassword,
        introducer_id || null,
        state?.toUpperCase() || null,
        level_percent || 70
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


