// Reads product info from product_life / product_annuity without changing schema.
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function resolveProductForOrder(order, client = pool) {
  const {
    product_line,         // 'life' | 'annuity'
    carrier_name,
    product_name,
    age_bracket = null,   // only for annuity
  } = order

  if (!product_line || !carrier_name || !product_name) {
    throw new Error('Missing product identifiers')
  }

  if (product_line === 'life') {
    // Exact case-insensitive match on carrier + product
    const { rows } = await client.query(
      `SELECT carrier_name, product_name, life_product_type,
              product_rate, fiso_rate, excess_rate, renewal_rate
         FROM product_life
        WHERE lower(carrier_name) = lower($1)
          AND lower(product_name) = lower($2)
        LIMIT 1`,
      [carrier_name, product_name]
    )
    return rows[0] || null
  } else if (product_line === 'annuity') {
    // If age_bracket supplied, match it case-insensitively; else match NULL/empty.
    const params = [carrier_name, product_name]
    let sql =
      `SELECT carrier_name, product_name, age_bracket,
              product_rate, fiso_rate, excess_rate, renewal_rate
         FROM product_annuity
        WHERE lower(carrier_name) = lower($1)
          AND lower(product_name) = lower($2)`

    if (age_bracket && String(age_bracket).trim()) {
      params.push(age_bracket)
      sql += ` AND lower(COALESCE(age_bracket,'')) = lower(COALESCE($3,''))`
    } else {
      sql += ` AND COALESCE(age_bracket,'') = ''`
    }

    sql += ` LIMIT 1`

    const { rows } = await client.query(sql, params)
    if (rows[0]) return rows[0]

    // Fallback: if no exact NULL/empty match, try ignoring bracket filter entirely
    const r2 = await client.query(
      `SELECT carrier_name, product_name, age_bracket,
              product_rate, fiso_rate, excess_rate, renewal_rate
         FROM product_annuity
        WHERE lower(carrier_name) = lower($1)
          AND lower(product_name) = lower($2)
        ORDER BY age_bracket NULLS FIRST
        LIMIT 1`,
      [carrier_name, product_name]
    )
    return r2.rows[0] || null
  }

  throw new Error(`Unknown product_line: ${product_line}`)
}

module.exports = { resolveProductForOrder }
