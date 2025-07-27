const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // adjust if your DB connection file is different
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();

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
    SELECT id FROM users
    WHERE state = $1 AND id IS NOT NULL
    ORDER BY id DESC
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [stateAbbr]);

  if (rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastId = rows[0].id;
  const number = parseInt(lastId.replace(prefix, '')) + 1;
  return `${prefix}${String(number).padStart(4, '0')}`;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

function createWelcomeEmail(userName, agentCode, introducerName) {
  return `Dear ${userName}:

Congratulations!

Welcome to join FISO Wealth Insurance Agency, a BDA name of FISO Group LLC. Your Agent Code is ${agentCode}, and your Direct sponsor is ${introducerName}.

Now you can update your information online and start getting appointment process. Please contact your sponsors or contracting@fisogroup.com if you have any questions.

Best regards,

FISO Group LLC`;
}

function createIntroducerEmail(introducerName, newUserName, agentCode, phone, email) {
  const today = new Date().toLocaleDateString();
  return `Dear ${introducerName}:

Congratulations!

${newUserName} with Agent Code ${agentCode} has joined your team on ${today}. Direct sponsor is ${introducerName}.

Please call or email to welcome the new joiner ${newUserName}: 
Phone: ${phone}
Email: ${email}

Please help to ensure the new joiner takes the new member fast start training within 24–48 hours, because the easiest way for the new joiner to succeed is to fully understand the FISO System, learn sales and product knowledge from Trainer and do it in practice.

I am looking forward to hearing more great news about business growth from your team!

Best regard,

FISO Group LLC`;
}

router.post('/register', async (req, res) => {
  const {
    name,
    email,
    phone,
    password, // SHA-256 hash from frontend
    introducer_id,
    state,
    national_producer_number
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const percent = 70;
    const stateUpper = state?.toUpperCase();
    const hierarchy_level = getHierarchyLevel(percent);

    const id = await generateEmployeeId(stateUpper);
    if (!introducer_id) {
      return res.status(400).json({ error: 'Introducer ID is required.' });
    }
    const introducerCheck = await pool.query('SELECT id FROM users WHERE id = $1', [introducer_id]);
    if (introducerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Introducer ID does not exist.' });
    }

    await pool.query(
      `INSERT INTO users (id, name, email, phone, password, introducer_id, state, hierarchy_level, national_producer_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ id,
        name,
        email,
        phone,
        hashedPassword,
        introducer_id || null,
        state?.toUpperCase() || null,
        hierarchy_level,
        national_producer_number
      ]
    );

    // Send welcome email to new user
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to FISO Group!',
      text: createWelcomeEmail(name, id, introducer.name)
    });

    // Send introducer notification
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: introducer.email,
      subject: 'New Team Member Joined',
      text: createIntroducerEmail(introducer.name, name, id, phone, email)
    });

    res.json({ message: 'User registered successfully and emails sent.' });


    //res.json({ message: 'User registered successfully' });
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
        phone: user.phone,
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


