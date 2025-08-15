const express = require('express')
const router = express.Router()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// List
router.get('/', async (req, res) => {
  try {
    const { carrier } = req.query
    const params = []
    let sql =
      `SELECT carrier_name, product_name, age_bracket,
              product_rate, fiso_rate, excess_rate, renewal_rate
         FROM product_annuity
        WHERE 1=1`
    if (carrier && carrier.trim()) {
      params.push(carrier)
      sql += ` AND lower(carrier_name) = lower($${params.length})`
    }
    sql += ` ORDER BY carrier_name, product_name, age_bracket NULLS FIRST`
    const { rows } = await pool.query(sql, params)
    res.json(rows)
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Failed to load annuity products' })
  }
})

// Upsert — uses ux_product_annuity on (carrier_name, product_name, COALESCE(age_bracket,''))
router.post('/', async (req, res) => {
  try {
    const {
      carrier_name, product_name, age_bracket = null,
      product_rate = null, fiso_rate = null, excess_rate = null, renewal_rate = null
    } = req.body

    if (!carrier_name || !product_name) {
      return res.status(400).json({ error: 'carrier_name and product_name are required' })
    }

    await pool.query(
      `INSERT INTO product_annuity
         (carrier_name, product_name, age_bracket,
          product_rate, fiso_rate, excess_rate, renewal_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT ON CONSTRAINT ux_product_annuity
       DO UPDATE SET
          product_rate = EXCLUDED.product_rate,
          fiso_rate    = EXCLUDED.fiso_rate,
          excess_rate  = EXCLUDED.excess_rate,
          renewal_rate = EXCLUDED.renewal_rate`,
      [carrier_name, product_name, age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Upsert failed' })
  }
})

// Rename/key-change safe update — identify original by natural keys in body
router.put('/', async (req, res) => {
  try {
    const {
      // new values
      carrier_name, product_name, age_bracket = null,
      product_rate = null, fiso_rate = null, excess_rate = null, renewal_rate = null,
      // original natural keys
      orig_carrier_name, orig_product_name, orig_age_bracket = null
    } = req.body

    if (!orig_carrier_name || !orig_product_name) {
      return res.status(400).json({ error: 'orig_carrier_name and orig_product_name are required' })
    }
    if (!carrier_name || !product_name) {
      return res.status(400).json({ error: 'carrier_name and product_name are required' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const keysChanged =
        carrier_name.toLowerCase() !== orig_carrier_name.toLowerCase() ||
        product_name.toLowerCase() !== orig_product_name.toLowerCase() ||
        String(age_bracket || '').toLowerCase() !== String(orig_age_bracket || '').toLowerCase()

      if (keysChanged) {
        await client.query(
          `DELETE FROM product_annuity
            WHERE lower(carrier_name) = lower($1)
              AND lower(product_name) = lower($2)
              AND lower(COALESCE(age_bracket,'')) = lower(COALESCE($3,''))`,
          [orig_carrier_name, orig_product_name, orig_age_bracket]
        )
      }

      await client.query(
        `INSERT INTO product_annuity
           (carrier_name, product_name, age_bracket,
            product_rate, fiso_rate, excess_rate, renewal_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT ON CONSTRAINT ux_product_annuity
         DO UPDATE SET
            product_rate = EXCLUDED.product_rate,
            fiso_rate    = EXCLUDED.fiso_rate,
            excess_rate  = EXCLUDED.excess_rate,
            renewal_rate = EXCLUDED.renewal_rate`,
        [carrier_name, product_name, age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate]
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

// Delete by natural keys
router.delete('/', async (req, res) => {
  try {
    const { carrier_name, product_name, age_bracket = null } = req.query
    if (!carrier_name || !product_name) {
      return res.status(400).json({ error: 'carrier_name and product_name are required' })
    }
    await pool.query(
      `DELETE FROM product_annuity
        WHERE lower(carrier_name) = lower($1)
          AND lower(product_name) = lower($2)
          AND lower(COALESCE(age_bracket,'')) = lower(COALESCE($3,''))`,
      [carrier_name, product_name, age_bracket]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Delete failed' })
  }
})

module.exports = router
