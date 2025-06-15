// utils/commission.js

/**
 * 根据用户年度累计成交金额，从 commission_chart 表中获取佣金比例
 * @param {object} client - PostgreSQL client（来自 pool.connect()）
 * @param {number} userId - 当前下单用户的 id
 * @returns {Promise<number>} - 返回适用的 commission_percent
 */
async function getCommissionPercent(client, userId) {
  const result = await client.query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM life_orders
    WHERE user_id = $1
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  `, [userId]);

  const totalAmount = result.rows[0].total;

  const chartRes = await client.query(`
    SELECT commission_percent
    FROM commission_chart
    WHERE $1 >= min_amount AND $1 <= max_amount
    ORDER BY commission_percent DESC
    LIMIT 1
  `, [totalAmount]);

  return chartRes.rows.length > 0 ? chartRes.rows[0].commission_percent : 70; // fallback 默认 70%
}

module.exports = { getCommissionPercent };
