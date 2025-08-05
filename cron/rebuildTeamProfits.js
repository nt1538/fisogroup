// cron/rebuildTeamProfits.js

const db = require('../config/db'); // 你的数据库连接文件

async function rebuildTeamProfits() {
  try {
    console.log('🛠 正在重新计算所有用户的 team_profit（滚动 12 个月内）...');

    // 拉取 rolling 12 months 内的 life 订单
    const { rows: lifeOrders } = await db.query(`
      SELECT user_id, target_premium
      FROM saved_life_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `);

    // 拉取 rolling 12 months 内的 annuity 订单
    const { rows: annuityOrders } = await db.query(`
      SELECT user_id, flex_premium
      FROM saved_annuity_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `);

    // 合并订单并统一为 target_premium 单位
    const allOrders = [
      ...lifeOrders.map(o => ({
        user_id: o.user_id,
        target_premium: parseFloat(o.target_premium || 0),
      })),
      ...annuityOrders.map(o => ({
        user_id: o.user_id,
        target_premium: parseFloat(o.flex_premium || 0) * 0.06,
      })),
    ];

    // 初始化 user -> team_profit 累加器
    const profitMap = new Map();

    for (const order of allOrders) {
      if (!order.user_id) continue;
      if (!profitMap.has(order.user_id)) profitMap.set(order.user_id, 0);
      profitMap.set(order.user_id, profitMap.get(order.user_id) + order.target_premium);
    }

    // 批量写入到 users 表
    for (const [userId, profit] of profitMap.entries()) {
      await db.query(
        `UPDATE users SET team_profit = $1 WHERE id = $2`,
        [profit.toFixed(2), userId]
      );
      console.log(`🔄 更新用户 ${userId} 的 team_profit = ${profit.toFixed(2)}`);
    }

    console.log(`✅ 重算完成，共更新 ${profitMap.size} 位用户的 team_profit`);
  } catch (err) {
    console.error('❌ Error rebuilding team profits:', err);
  }
}

module.exports = rebuildTeamProfits;
