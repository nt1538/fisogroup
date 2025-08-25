// utils/productResolver.js
const pool = require('../db')

async function resolveProductForOrder(order, client = pool) {
  const product_line = order.product_line || (order.face_amount != null || order.target_premium != null ? 'life' : 'annuity')
  const carrier_name = order.carrier_name
  const product_name = order.product_name
  const age_bracket = order.age_bracket || null

  if (!product_line || !carrier_name || !product_name) return null

  if (product_line === 'life') {
    const { rows } = await client.query(
      `SELECT life_product_type, product_rate, fiso_rate, excess_rate, renewal_rate
         FROM product_life
        WHERE lower(carrier_name)=lower($1) AND lower(product_name)=lower($2)
        LIMIT 1`,
      [carrier_name, product_name]
    )
    return rows[0] || null
  }

  if (product_line === 'annuity') {
    const params = [carrier_name, product_name]
    let sql =
      `SELECT age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate
         FROM product_annuity
        WHERE lower(carrier_name)=lower($1) AND lower(product_name)=lower($2)`
    if (age_bracket && String(age_bracket).trim()) {
      params.push(age_bracket)
      sql += ` AND lower(COALESCE(age_bracket,'')) = lower(COALESCE($3,''))`
    } else {
      sql += ` AND COALESCE(age_bracket,'') = ''`
    }
    sql += ` LIMIT 1`

    const { rows } = await client.query(sql, params)
    if (rows[0]) return rows[0]

    // fallback: any bracket
    const r2 = await client.query(
      `SELECT age_bracket, product_rate, fiso_rate, excess_rate, renewal_rate, agent_excess_rate, agent_renewal_rate
         FROM product_annuity
        WHERE lower(carrier_name)=lower($1) AND lower(product_name)=lower($2)
        ORDER BY age_bracket NULLS FIRST
        LIMIT 1`,
      [carrier_name, product_name]
    )
    return r2.rows[0] || null
  }

  return null
}

module.exports = { resolveProductForOrder }
