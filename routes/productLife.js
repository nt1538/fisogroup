const express = require('express')
const router = express.Router()
const pool = require('../db')

// List
router.get('/', async (req, res) => {
  try {
    const { carrier } = req.query
    const params = []
    let sql =
      `SELECT carrier_name, product_name, life_product_type,
              product_rate, fiso_rate, excess_rate, renewal_rate, agent_excess_rate, agent_renewal_rate
         FROM product_life
        WHERE 1=1`
    if (carrier && carrier.trim()) {
      params.push(carrier)
      sql += ` AND lower(carrier_name) = lower($${params.length})`
    }
    sql += ` ORDER BY carrier_name, product_name`
    const { rows } = await pool.query(sql, params)
    res.json(rows)
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Failed to load life products' })
  }
})

// Upsert (create or update) — uses your unique constraint ux_product_life
router.post('/', async (req, res) => {
  try {
    const {
      carrier_name, product_name, life_product_type = null,
      product_rate = null, fiso_rate = null, excess_rate = null, renewal_rate = null
    } = req.body

    if (!carrier_name || !product_name) {
      return res.status(400).json({ error: 'carrier_name and product_name are required' })
    }

    await pool.query(
      `INSERT INTO product_life
         (carrier_name, product_name, life_product_type,
          product_rate, fiso_rate, excess_rate, renewal_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT ON CONSTRAINT ux_product_life
       DO UPDATE SET
          life_product_type = EXCLUDED.life_product_type,
          product_rate      = EXCLUDED.product_rate,
          fiso_rate         = EXCLUDED.fiso_rate,
          excess_rate       = EXCLUDED.excess_rate,
          renewal_rate      = EXCLUDED.renewal_rate,
          agent_excess_rate       = EXCLUDED.agent_excess_rate,
          agent_renewal_rate      = EXCLUDED.agent_renewal_rate`,
      [carrier_name, product_name, life_product_type, product_rate, fiso_rate, excess_rate, renewal_rate]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Upsert failed' })
  }
})

// Rename / key-change safe update — identifies original row by keys in query/body
router.put('/', async (req, res) => {
  try {
    const {
      // new values
      carrier_name, product_name, life_product_type = null,
      product_rate = null, fiso_rate = null, excess_rate = null, renewal_rate = null,
      // original keys (required if changing keys)
      orig_carrier_name, orig_product_name
    } = req.body

    if (!orig_carrier_name || !orig_product_name) {
      return res.status(400).json({ error: 'orig_carrier_name and orig_product_name are required' })
    }
    if (!carrier_name || !product_name) {
      return res.status(400).json({ error: 'carrier_name and product_name are required' })
    }

    // If keys unchanged, simple update. If changed, delete+insert (to keep UX constraint happy).
    const keysChanged = (
      carrier_name.toLowerCase() !== orig_carrier_name.toLowerCase() ||
      product_name.toLowerCase() !== orig_product_name.toLowerCase()
    )

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (keysChanged) {
        await client.query(
          `DELETE FROM product_life
            WHERE lower(carrier_name)=lower($1)
              AND lower(product_name)=lower($2)`,
          [orig_carrier_name, orig_product_name]
        )
      }
      await client.query(
        `INSERT INTO product_life
           (carrier_name, product_name, life_product_type,
            product_rate, fiso_rate, excess_rate, renewal_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT ON CONSTRAINT ux_product_life
         DO UPDATE SET
            life_product_type = EXCLUDED.life_product_type,
            product_rate      = EXCLUDED.product_rate,
            fiso_rate         = EXCLUDED.fiso_rate,
            excess_rate       = EXCLUDED.excess_rate,
            renewal_rate      = EXCLUDED.renewal_rate,
            agent_excess_rate       = EXCLUDED.agent_excess_rate,
            agent_renewal_rate      = EXCLUDED.agent_renewal_rate`,
        [carrier_name, product_name, life_product_type, product_rate, fiso_rate, excess_rate, renewal_rate]
      )
      await client.query('COMMIT')
      res.json({ ok: true })
    } catch (e) {
      await client.query('ROLLBACK'); throw e
    } finally {
      client.release()
    }
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Update failed' })
  }
})

// Delete by natural key
router.delete('/', async (req, res) => {
  try {
    const { carrier_name, product_name } = req.query
    if (!carrier_name || !product_name) {
      return res.status(400).json({ error: 'carrier_name and product_name are required' })
    }
    await pool.query(
      `DELETE FROM product_life
        WHERE lower(carrier_name) = lower($1)
          AND lower(product_name) = lower($2)`,
      [carrier_name, product_name]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Delete failed' })
  }
})

module.exports = router
