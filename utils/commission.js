async function getCommissionPercent(client, user_id) {
  // 查询该用户所有订单（life + annuity）的总初始保费
  const { rows } = await client.query(`
    SELECT 
      COALESCE(SUM(initial_premium), 0) AS total_premium
    FROM (
      SELECT initial_premium FROM life_orders WHERE user_id = $1
      UNION ALL
      SELECT initial_premium FROM annuity_orders WHERE user_id = $1
    ) AS all_orders
  `, [user_id]);

  const total = rows[0].total_premium;

  // 你可以按实际设置的佣金图表调整以下区间
  if (total >= 2000000) return 100;
  if (total >= 1000000) return 95;
  if (total >= 500000) return 90;
  if (total >= 250000) return 85;
  if (total >= 60000) return 80;
  if (total >= 30000) return 75;
  return 70;
}

module.exports = { getCommissionPercent };