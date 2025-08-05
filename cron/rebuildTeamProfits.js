const pool = require('../db');
const { getHierarchy, reconcileLevel } = require('../utils/commission');

async function rebuildTeamProfits() {
  console.log('🛠 正在重新计算所有用户的 team_profit（滚动 12 个月内）...');

  const commissionChart = (await pool.query('SELECT * FROM commission_chart')).rows;

  // Step 1: 初始化所有用户的 team_profit = 0
  await pool.query('UPDATE users SET team_profit = 0');

  // Step 2: 获取所有订单（12个月内）
  const [lifeOrders, annuityOrders] = await Promise.all([
    pool.query(`
      SELECT id, user_id, target_premium, commission_distribution_date
      FROM saved_life_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `),
    pool.query(`
      SELECT id, user_id, target_premium, commission_distribution_date
      FROM saved_annuity_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `),
  ]);

  const validOrders = [...lifeOrders.rows, ...annuityOrders.rows];

  const teamProfitMap = new Map(); // user_id -> team_profit

  // Step 3: 累加 target_premium 给每个用户及其 introducers
  for (const order of validOrders) {
    const userId = order.user_id;
    const targetPremium = parseFloat(order.target_premium || 0);
    if (targetPremium <= 0) continue;

    const hierarchy = await getHierarchy(userId); // 包含写单人

    for (const member of hierarchy) {
      const oldProfit = teamProfitMap.get(member.id) || 0;
      teamProfitMap.set(member.id, oldProfit + targetPremium);
    }
  }

  // Step 4: 更新数据库中的 users 表
  for (const [userId, teamProfit] of teamProfitMap.entries()) {
    const res = await pool.query(`SELECT hierarchy_level FROM users WHERE id = $1`, [userId]);
    const currentLevel = res.rows[0].hierarchy_level;
    const newLevel = reconcileLevel(teamProfit, currentLevel, commissionChart);

    await pool.query(`
      UPDATE users SET team_profit = $1, hierarchy_level = $2 WHERE id = $3
    `, [teamProfit, newLevel, userId]);
  }

  console.log('✅ 所有用户的团队业绩和等级已成功刷新（按滚动12个月）。');
}

rebuildTeamProfits().catch(err => {
  console.error('❌ Error rebuilding team profits:', err);
  process.exit(1);
});
