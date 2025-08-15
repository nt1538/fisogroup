// utils/products.js
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function slug(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function resolveProductForOrder(order, client = pool) {
  const {
    product_line,         // 'life' | 'annuity'
    carrier_name,
    product_name,
    age_bracket,          // optional (annuity)
  } = order

  if (!product_line || !carrier_name || !product_name) {
    throw new Error('Missing product identifiers')
  }

  const sCarrier = slug(carrier_name)
  const sProduct = slug(product_name)
  const sBracket = slug(age_bracket || '')

  // Try exact (slug) match first
  const params = [product_line, sCarrier, sProduct]
  let sql =
    `SELECT * FROM products
      WHERE product_line = $1
        AND slug_carrier = $2
        AND slug_product = $3`

  // add bracket filter for annuity if provided
  if (product_line === 'annuity' && sBracket) {
    params.push(sBracket)
    sql += ` AND (slug_age_bracket = $4)`
  }

  sql += ` ORDER BY is_active DESC, updated_at DESC LIMIT 1;`

  const { rows } = await client.query(sql, params)
  if (rows.length) return rows[0]

  // Fallback: partial (ILIKE) in case of slight label mismatch
  const ilikeParams = [product_line, `%${sCarrier}%`, `%${sProduct}%`]
  let ilikeSql =
    `SELECT * FROM products
      WHERE product_line = $1
        AND slug_carrier ILIKE $2
        AND slug_product ILIKE $3`

  if (product_line === 'annuity' && sBracket) {
    ilikeParams.push(`%${sBracket}%`)
    ilikeSql += ` AND (slug_age_bracket ILIKE $4)`
  }
  ilikeSql += ` ORDER BY is_active DESC, updated_at DESC LIMIT 1;`

  const res2 = await client.query(ilikeSql, ilikeParams)
  if (res2.rows.length) return res2.rows[0]

  // Not found — caller may decide to block or proceed with default rates
  return null
}

module.exports = { resolveProductForOrder, slug }
