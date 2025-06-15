const express = require('express');
const pool = require('../db');
const router = express.Router();

// Generation override rates: Gen1 = 5%, Gen2 = 3%, Gen3 = 1%
const overrideRates = [5, 3, 1]; // in %

router.post('/life', async (req, res) => {
  try {
    const {
      user_id,
      statement_date,
      writing_agent,
      provider,
      policy_no,
      premium
    } = req.body;

    await distributeCommission(user_id, {
      statement_date,
      writing_agent,
      provider,
      policy_no,
      premium
    });

    return res.status(200).json({ message: 'Order and commissions processed.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process commission' });
  }
});

async function distributeCommission(userId, orderData) {
  const { premium, policy_no, statement_date, provider, writing_agent } = orderData;

  const originRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!originRes.rows.length) throw new Error('Origin user not found');
  let current = originRes.rows[0];

  // Step 1: Writing agent personal commission
  const personalRate = current.level_percent;
  await insertOrder({
    code: 'TX002',
    statement_date,
    payee_name: current.name,
    writing_agent,
    provider,
    policy_no,
    premium,
    rate: personalRate,
    paid: premium * personalRate / 100,
    comment: 'Personal Commission'
  });

  let prevRate = personalRate;
  let depth = 0;
  let genOverrideDepth = 0;

  // Step 2: Walk up introducer chain
  while (current.introducer_id && depth < 10) {
    const introRes = await pool.query('SELECT * FROM users WHERE id = $1', [current.introducer_id]);
    const introducer = introRes.rows[0];
    if (!introducer) break;

    const levelRate = introducer.level_percent;
    const levelDiff = Math.max(0, levelRate - prevRate);

    // 2a. Level difference commission
    if (levelDiff > 0) {
      await insertOrder({
        code: 'TX001',
        statement_date,
        payee_name: introducer.name,
        writing_agent,
        provider,
        policy_no,
        premium,
        rate: levelDiff,
        paid: premium * levelDiff / 100,
        comment: 'Level Difference'
      });
    }

    // 2b. Generation override commission (Agency1+ = 85% or higher)
    if (genOverrideDepth < overrideRates.length && levelRate >= 85) {
      const overrideRate = overrideRates[genOverrideDepth];
      await insertOrder({
        code: 'PA001',
        statement_date,
        payee_name: introducer.name,
        writing_agent,
        provider,
        policy_no,
        premium,
        rate: overrideRate,
        paid: premium * overrideRate / 100,
        comment: 'Generation Override'
      });
      genOverrideDepth++;
    }

    prevRate = levelRate;
    current = introducer;
    depth++;
  }
}

// Insert a single life_orders row
async function insertOrder(data) {
  await pool.query(`
    INSERT INTO life_orders (
      code, statement_date, payee_name, writing_agent, provider, policy_no,
      premium, split_percent, product_rate, rate, paid, comment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 100, 100, $8, $9, $10)
  `, [
    data.code,
    data.statement_date,
    data.payee_name,
    data.writing_agent,
    data.provider,
    data.policy_no,
    data.premium,
    data.rate,
    data.paid,
    data.comment
  ]);
}

module.exports = router;


