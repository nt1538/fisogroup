const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // adjust if your DB connection file is different
const router = express.Router();
const nodemailer = require('nodemailer');
const { sendEmail } = require('../utils/sendEmail');
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

async function getAllSupervisors(userId) {
  const supervisors = [];

  let currentId = userId;

  while (currentId) {
    const res = await pool.query(
      'SELECT introducer_id, name, email FROM users WHERE id = $1',
      [currentId]
    );

    const row = res.rows[0];
    if (!row || !row.introducer_id) break;

    const supervisor = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [row.introducer_id]
    );

    if (supervisor.rows[0]) {
      supervisors.push(supervisor.rows[0]);
      currentId = supervisor.rows[0].id;
    } else {
      break;
    }
  }

  return supervisors; // 从近到远
}


function createWelcomeEmail(userName, agentCode, introducerName, introducerCode) {
  return `Dear ${userName}:

Congratulations!

Welcome to join FISO Group LLC. Your Agent Code is ${agentCode}, and your Direct sponsor is ${introducerName}, ${introducerCode}.

Now you can update your information online and start getting appointment process. Please contact your sponsors or contracting@fisogroup.com if you have any questions.

Best regards,

FISO Group LLC`;
}

function createIntroducerEmail(introducerName, newUserName, agentCode, phone, email, introducerCode) {
  const today = new Date().toLocaleDateString();
  return `Dear ${introducerName}:

Congratulations!

${newUserName} with Agent Code ${agentCode} has joined your team on ${today}. Direct sponsor is ${introducerName}, ${introducerCode}.

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
    password, // SHA-256 hash from frontend? (we still bcrypt it here)
    introducer_id,
    state,
    national_producer_number
  } = req.body;

  try {
    if (!introducer_id) {
      return res.status(400).json({ error: 'Introducer ID is required.' });
    }

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) {
      // Already registered — treat as success
      return res.json({ message: 'Account already exists. You can log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const percent = 70;
    const stateUpper = state?.toUpperCase() || null;
    const hierarchy_level = getHierarchyLevel(percent);

    const id = await generateEmployeeId(stateUpper);

    // fetch introducer info (include id for safety)
    const introducerCheck = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [introducer_id]
    );
    if (introducerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Introducer ID does not exist.' });
    }
    const introducer = introducerCheck.rows[0];

    await pool.query(
      `INSERT INTO users (id, name, email, phone, password, introducer_id, state, hierarchy_level, national_producer_number,team_profit,personal_production)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0)`,
      [
        id,
        name,
        email,
        phone,
        hashedPassword,
        introducer_id,
        stateUpper,
        hierarchy_level,
        national_producer_number
      ]
    );

    (async () => {
      try {
        await sendEmail({
          to: email,
          subject: 'Welcome to FISO Group!',
          html: `<pre style="font-family:inherit;white-space:pre-wrap">${createWelcomeEmail(
            name,
            newId,
            introducer.name,
            introducer.id
          )}</pre>`
        });

        // walk the chain and notify
        const supervisors = await getAllSupervisors(newId);
        for (const sup of supervisors) {
          if (!sup?.email) continue;
          await sendEmail({
            to: sup.email,
            subject: 'New Team Member Joined',
            html: `<pre style="font-family:inherit;white-space:pre-wrap">${createIntroducerEmail(
              introducer.name,
              name,
              newId,
              phone,
              email,
              introducer.id
            )}</pre>`
          });
        }
      } catch (mailErr) {
        console.error('⚠️ Email notification failed (registration succeeded):', mailErr);
      }
    })();

    // ✅ Always report success once DB insert succeeded
    return res.json({
      message: 'User registered successfully. If you did not receive a welcome email, please check spam or contact support.'
    });

  } catch (err) {
    console.error('Registration error (outer):', err);

    // If something threw after the user was created (or due to a race),
    // verify user existence and still return success.
    try {
      if (email) {
        const { rows: check } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.length) {
          return res.json({
            message: 'User registered successfully. If you did not receive a welcome email, please check spam or contact support.'
          });
        }
      }
      if (newId) {
        const { rows: check2 } = await pool.query('SELECT id FROM users WHERE id = $1', [newId]);
        if (check2.length) {
          return res.json({
            message: 'User registered successfully. If you did not receive a welcome email, please check spam or contact support.'
          });
        }
      }
    } catch (verifyErr) {
      console.error('Post-error verification failed:', verifyErr);
    }

    // Otherwise it really failed to create the account
    return res.status(500).json({ error: 'Registration failed' });
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
      { expiresIn: '4h' }
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


