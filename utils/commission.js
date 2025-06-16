async function getCommissionPercent(client, user_id, amount) {
  // 从 commission_chart 查找匹配区间
  const result = await client.query(
    `SELECT commission_percent FROM commission_chart 
     WHERE user_id = $1 AND $2 >= min_amount AND $2 <= max_amount
     ORDER BY percent DESC LIMIT 1`,
    [user_id, amount]
  );

  return result.rows.length ? result.rows[0].percent : 0;
}

module.exports = { getCommissionPercent };