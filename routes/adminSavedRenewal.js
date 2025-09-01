const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const { resolveProductForOrder } = require('../utils/productResolver')

// Level % helper
async function getLevelPercent(client, hierarchyLevel) {
  const { rows } = await client.query(
    `SELECT commission_percent FROM commission_chart WHERE title = $1 LIMIT 1`,
    [hierarchyLevel]
  )
  if (rows.length && Number.isFinite(Number(rows[0].commission_percent))) {
    return Number(rows[0].commission_percent)
  }
  const { rows: def } = await client.query(
    `SELECT commission_percent FROM commission_chart ORDER BY min_amount ASC LIMIT 1`
  )
  return Number(def[0]?.commission_percent || 0)
}

// Insert helper (unchanged)
async function insertCommissionRow(client, table, order, userRow, orderType, commissionPercent, commissionAmount, explanation) {
  const isAnnuity = table.includes('annuity')
  const sql = isAnnuity ? `
    INSERT INTO ${table} (
      user_id, full_name, national_producer_number, hierarchy_level,
      commission_percent, commission_amount, carrier_name, product_name,
      application_date, commission_distribution_date, policy_effective_date, policy_number,
      insured_name, writing_agent, flex_premium, product_rate,
      initial_premium, commission_from_carrier, application_status, mra_status,
      order_type, parent_order_id, explanation,
      split_percent, split_with_id
    ) VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,$8,
      $9,$10,$11,$12,
      $13,$14,$15,$16,
      $17,$18,$19,$20,
      $21,$22,$23,
      $24,$25
    )
  ` : `
    INSERT INTO ${table} (
      user_id, full_name, national_producer_number, hierarchy_level,
      commission_percent, commission_amount, carrier_name, product_name,
      application_date, commission_distribution_date, policy_effective_date, policy_number,
      insured_name, writing_agent, face_amount, target_premium, product_rate,
      initial_premium, commission_from_carrier, application_status, mra_status,
      order_type, parent_order_id, explanation,
      split_percent, split_with_id
    ) VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,$8,
      $9,$10,$11,$12,
      $13,$14,$15,$16,$17,
      $18,$19,$20,$21,
      $22,$23,$24,
      $25,$26
    )
  `

  const vals = isAnnuity
    ? [
        userRow.id, userRow.name, userRow.national_producer_number, userRow.hierarchy_level,
        commissionPercent, commissionAmount, order.carrier_name, order.product_name,
        order.application_date, order.commission_distribution_date, order.policy_effective_date, order.policy_number,
        order.insured_name, order.writing_agent, order.flex_premium, order.product_rate,
        order.initial_premium, order.commission_from_carrier, order.application_status, order.mra_status,
        orderType, order.id, explanation,
        order.split_percent, order.split_with_id
      ]
    : [
        userRow.id, userRow.name, userRow.national_producer_number, userRow.hierarchy_level,
        commissionPercent, commissionAmount, order.carrier_name, order.product_name,
        order.application_date, order.commission_distribution_date, order.policy_effective_date, order.policy_number,
        order.insured_name, order.writing_agent, order.face_amount, order.target_premium, order.product_rate,
        order.initial_premium, order.commission_from_carrier, order.application_status, order.mra_status,
        orderType, order.id, explanation,
        order.split_percent, order.split_with_id
      ]

  await client.query(sql, vals)
}

// --- RENEWAL (life only, no split, agent renewal rate × level %) ---
router.post('/saved/:tableType/:id/renewal', verifyToken, verifyAdmin, async (req, res) => {
  const { tableType, id } = req.params;

  if (tableType !== 'saved_life_orders') {
    return res.status(400).json({ error: 'Renewal is only available for life products' });
  }
  const commissionTable = 'commission_life';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ordRows } = await client.query(
      `SELECT * FROM ${tableType} WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!ordRows.length) {
      await client.query('ROLLBACK'); client.release();
      return res.status(404).json({ error: 'Saved order not found' });
    }
    const saved = ordRows[0];

    // resolve agent renewal rate
    const prod = await resolveProductForOrder({
      product_line: 'life',
      carrier_name: saved.carrier_name,
      product_name: saved.product_name,
      age_bracket: null
    }, client);

    const agentRenewalRate = prod ? Number(prod.agent_renewal_rate || 0) : 0;
    if (!Number.isFinite(agentRenewalRate) || agentRenewalRate <= 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(400).json({ error: 'No agent renewal rate found for this product' });
    }

    // --- NEW: optional override from admin ---
    // accept paid_amount (preferred) or renewal_base
    const rawInput = req.body?.paid_amount ?? req.body?.renewal_base;
    let basePremium = Number(saved.target_premium || 0);
    if (rawInput !== undefined && rawInput !== null && rawInput !== '') {
      const typed = Number(rawInput);
      if (!Number.isFinite(typed) || typed < 0) {
        await client.query('ROLLBACK'); client.release();
        return res.status(400).json({ error: 'Invalid paid amount' });
      }
      basePremium = typed;
    }

    // writer + level
    const { rows: uRows } = await client.query(
      `SELECT id, name, national_producer_number, hierarchy_level FROM users WHERE id = $1`,
      [saved.user_id]
    );
    if (!uRows.length) {
      await client.query('ROLLBACK'); client.release();
      return res.status(404).json({ error: 'Writing agent not found' });
    }
    const writer = uRows[0];
    const levelPct = await getLevelPercent(client, writer.hierarchy_level);

    const effectivePercent = agentRenewalRate * (levelPct / 100);
    const commissionAmount = basePremium * (effectivePercent / 100);

    // reflect the admin-entered base & stamp commission date
    const orderForInsert = {
      ...saved,
      product_rate: agentRenewalRate,
      target_premium: basePremium,                       // <— use the entered amount
      split_percent: 100,
      split_with_id: null,
      commission_distribution_date: new Date().toISOString(), // stamp now
    };

    const explanation =
      `Renewal — agent_renewal_rate ${agentRenewalRate}% × level ${levelPct}% = ` +
      `effective ${effectivePercent.toFixed(2)}% on entered base ${basePremium}`;

    await insertCommissionRow(
      client,
      commissionTable,
      orderForInsert,
      writer,
      'Renewal',
      effectivePercent,
      commissionAmount,
      explanation
    );

    await client.query(
      `UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2`,
      [commissionAmount, writer.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, message: 'Renewal commission created', base_used: basePremium });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Renewal error', e);
    res.status(500).json({ error: 'Failed to create renewal commission' });
  } finally {
    client.release();
  }
});

module.exports = router
