const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken, verifyAdmin } = require('../middleware/auth') // adjust paths if needed
const { resolveProductForOrder } = require('../utils/productResolver')

// Helper: insert one commission row (matches your existing schema)
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
        order.insured_name, order.writing_agent, order.flex_premium, order.product_rate, // product_rate is renewal rate here
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

router.post('/saved/:tableType/:id/renewal', verifyToken, verifyAdmin, async (req, res) => {
  const { tableType, id } = req.params
  const allowed = new Set(['saved_life_orders','saved_annuity_orders'])
  if (!allowed.has(tableType)) return res.status(400).json({ error: 'Invalid saved table type' })

  const isLife = tableType.includes('life')
  const commissionTable = isLife ? 'commission_life' : 'commission_annuity'

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1) Load saved order
    const { rows: ordRows } = await client.query(`SELECT * FROM ${tableType} WHERE id = $1 FOR UPDATE`, [id])
    if (!ordRows.length) {
      await client.query('ROLLBACK'); client.release()
      return res.status(404).json({ error: 'Saved order not found' })
    }
    const saved = ordRows[0]

    // 2) Resolve renewal rate from product tables
    const prod = await resolveProductForOrder({
      product_line: isLife ? 'life' : 'annuity',
      carrier_name: saved.carrier_name,
      product_name: saved.product_name,
      age_bracket: saved.age_bracket || null
    }, client)

    const renewalRate = prod ? Number(prod.renewal_rate || 0) : 0
    if (!Number.isFinite(renewalRate) || renewalRate <= 0) {
      await client.query('ROLLBACK'); client.release()
      return res.status(400).json({ error: 'No renewal rate found for this product' })
    }

    // 3) Compute base & set product_rate to renewalRate for this commission
    const basePremium = isLife
      ? Number(saved.target_premium || 0)
      : Number(saved.flex_premium || 0)

    // Reuse most fields from saved order but override product_rate = renewalRate
    const orderForInsert = { ...saved, product_rate: renewalRate }

    // 4) Determine split (two rows) or single row
    const hasSplit = saved.split_with_id && Number(saved.split_percent) < 100
    const splitOtherPct = hasSplit ? Number(saved.split_percent) : 0
    const writingPct = hasSplit ? (100 - splitOtherPct) : 100

    const makeEntry = async (targetUserId, pctShare) => {
      const { rows: uRows } = await client.query(`SELECT id, name, national_producer_number, hierarchy_level FROM users WHERE id = $1`, [targetUserId])
      if (!uRows.length) return
      const u = uRows[0]

      // Commission is base * share% * renewalRate%
      const segPremium = basePremium * (pctShare / 100)
      const commissionAmount = segPremium * (renewalRate / 100)
      const commissionPercent = renewalRate // store the renewal rate as the commission_percent

      // explanation shows it’s a renewal and which rate was used
      const explanation = `Renewal — renewal_rate ${renewalRate}% on base ${isLife ? 'target_premium' : 'flex_premium'} × ${pctShare}%`

      await insertCommissionRow(client, commissionTable, orderForInsert, u, 'Renewal', commissionPercent, commissionAmount, explanation)

      // Only update total_earnings (NO team_profit updates)
      await client.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [commissionAmount, u.id])
    }

    // main writer
    await makeEntry(saved.user_id, writingPct)

    // split writer
    if (hasSplit) {
      await makeEntry(saved.split_with_id, splitOtherPct)
    }

    await client.query('COMMIT')
    res.json({ ok: true, message: 'Renewal commission created' })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Renewal error', e)
    res.status(500).json({ error: 'Failed to create renewal commission' })
  } finally {
    client.release()
  }
})

module.exports = router
