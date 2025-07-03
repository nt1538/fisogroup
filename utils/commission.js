const db = require('../db');

// 获取佣金等级表
async function getCommissionChart() {
  const res = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return res.rows;
}

// 根据 profit 获取等级
function getLevelTitleByProfit(profit, chart) {
  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) {
      return row.title;
    }
  }
  return chart[0]?.title || 'Level A';
}

// 获取等级对应提成百分比
function getLevelPercentByTitle(title, chart) {
  const row = chart.find(r => r.title === title);
  return row ? row.commission_percent : chart[0].commission_percent;
}

// 获取用户向上3级层级
async function getHierarchy(userId) {
  const hierarchy = [];
  let currentId = userId;
  for (let i = 0; i < 3; i++) {
    const res = await db.query('SELECT id, introducer_id, profit, hierarchy_level FROM users WHERE id = $1', [currentId]);
    if (!res.rows.length) break;
    const u = res.rows[0];
    if (!u.introducer_id) break;
    hierarchy.push(u);
    currentId = u.introducer_id;
  }
  return hierarchy;
}

// 检查需要拆分的利润边界
async function checkSplitPoints(order, chart, hierarchy) {
  const profitMap = new Map();
  const beforeLevels = new Map();
  const afterLevels = new Map();
  const baseAmount = parseFloat(order.commission_from_carrier || 0);

  // 加入订单所属人
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [order.user_id]);
  const self = userRes.rows[0];
  const allUsers = [...hierarchy, self];

  for (const u of allUsers) {
    const before = parseFloat(u.profit || 0);
    const after = before + baseAmount;
    profitMap.set(u.id, [before, after]);
    beforeLevels.set(u.id, getLevelTitleByProfit(before, chart));
    afterLevels.set(u.id, getLevelTitleByProfit(after, chart));
  }

  const points = new Set();

  for (const [id, [before, after]] of profitMap.entries()) {
    if (beforeLevels.get(id) !== afterLevels.get(id)) {
      for (const row of chart) {
        if (row.min_amount > before && row.min_amount < after) {
          points.add(row.min_amount - parseFloat(self.profit));
        }
      }
    }
  }

  const sorted = [...points].sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : false;
}

// 插入佣金子订单记录
async function insertCommissionOrder(order, user, type, percent, amount, explanation, parentId) {
  await db.query(`
    INSERT INTO life_orders (
      user_id, full_name, national_producer_number, hierarchy_level,
      commission_percent, commission_amount, carrier_name, product_name,
      application_date, policy_number, face_amount, target_premium,
      initial_premium, commission_from_carrier, application_status, mra_status,
      order_type, parent_order_id, explanation
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19
    )
  `, [
    user.id, user.full_name, user.national_producer_number, user.hierarchy_level,
    percent, amount, order.carrier_name, order.product_name_carrier,
    order.application_date, order.policy_number, order.face_amount, order.target_premium,
    order.initial_premium, order.commission_from_carrier, order.application_status, order.mra_status,
    type, parentId, explanation
  ]);

  await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amount, user.id]);
}

// 分发层级提成（级差 + 代际）
async function distributeUpline(order, hierarchy, baseAmount, chart, parentId) {
  // 获取订单所属员工信息
  const employeeRes = await db.query('SELECT profit, hierarchy_level FROM users WHERE id = $1', [order.user_id]);
  const employeeProfit = parseFloat(employeeRes.rows[0].profit || 0);
  const employeeTitle = getLevelTitleByProfit(employeeProfit, chart);
  const employeePercent = getLevelPercentByTitle(employeeTitle, chart);

  let currentId = order.user_id;
  let generation = 0;

  while (true) {
    const res = await db.query('SELECT id, name, national_producer_number, profit, hierarchy_level, introducer_id FROM users WHERE id = $1', [currentId]);
    if (!res.rows.length) break;
    const currentUser = res.rows[0];
    if (!currentUser.introducer_id) break;

    const uRes = await db.query('SELECT * FROM users WHERE id = $1', [currentUser.introducer_id]);
    if (!uRes.rows.length) break;

    const u = uRes.rows[0];
    const uProfit = parseFloat(u.profit || 0);
    const uTitle = getLevelTitleByProfit(uProfit, chart);
    const uPercent = getLevelPercentByTitle(uTitle, chart);

    // === Level Difference ===
    const downPercent = generation === 0 ? employeePercent : getLevelPercentByTitle(currentUser.hierarchy_level, chart);
    const diff = uPercent - downPercent;
    if (diff > 0.01) {
      const diffAmount = baseAmount * (diff / 100);
      await insertCommissionOrder(order, u, 'Level Difference', diff, diffAmount, `Level Difference with ${currentUser.full_name}`, parentId);
    }

    // === Generation Override ===
    if (generation < 3) {
      const overridePercent = generation === 0 ? 5 : generation === 1 ? 3 : generation === 2 ? 1 : 0;
      const overrideAmount = baseAmount * (overridePercent / 100);
      if (overrideAmount > 0.01) {
        await insertCommissionOrder(order, u, 'Generation Override', overridePercent, overrideAmount, `Generation ${generation + 1}`, parentId);
      }
    }

    // 往上继续
    currentId = u.id;
    generation += 1;
  }
}

// 主函数：分发佣金
async function handleCommissions(order, userId) {
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const baseAmount = parseFloat(order.commission_from_carrier || 0);
  const profitBefore = parseFloat(user.profit || 0);

  const hierarchy = await getHierarchy(userId);
  const splitPoints = await checkSplitPoints(order, chart, hierarchy);

  if (!splitPoints) {
    // 不拆分，直接处理
    const level = getLevelTitleByProfit(profitBefore, chart);
    const percent = getLevelPercentByTitle(level, chart);
    const amount = baseAmount * (percent / 100);
    await insertCommissionOrder(order, user, 'Personal Commission', percent, amount, 'Full Commission', order.id);
    await distributeUpline(order, hierarchy, baseAmount, chart, order.id);
    await db.query('UPDATE users SET profit = profit + $1 WHERE id = $2', [baseAmount, userId]);

    const newLevel = getLevelTitleByProfit(profitBefore + baseAmount, chart);
    if (newLevel !== user.hierarchy_level) {
      await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel, userId]);
    }
    return;
  }

  // 拆分订单并处理每段
  const segments = [0, ...splitPoints, baseAmount];
  for (let i = 0; i < segments.length - 1; i++) {
    const segmentAmount = segments[i + 1] - segments[i];
    const segmentProfit = profitBefore + segments[i];

    const level = getLevelTitleByProfit(segmentProfit, chart);
    const percent = getLevelPercentByTitle(level, chart);
    const commissionAmount = segmentAmount * (percent / 100);

    await insertCommissionOrder(order, user, 'Personal Commission', percent, commissionAmount, `Segment ${i + 1}`, order.id);
    await distributeUpline(order, hierarchy, segmentAmount, chart, order.id);
    await db.query('UPDATE users SET profit = profit + $1 WHERE id = $2', [segmentAmount, userId]);

    // 更新所有 hierarchy 的等级
    const updatedUser = await db.query('SELECT profit FROM users WHERE id = $1', [userId]);
    const newLevel = getLevelTitleByProfit(parseFloat(updatedUser.rows[0].profit), chart);
    if (newLevel !== user.hierarchy_level) {
      await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel, userId]);
    }

    for (const h of hierarchy) {
      const hr = await db.query('SELECT profit FROM users WHERE id = $1', [h.id]);
      const p = parseFloat(hr.rows[0].profit || 0);
      const newL = getLevelTitleByProfit(p, chart);
      if (newL !== h.hierarchy_level) {
        await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newL, h.id]);
      }
    }
  }

  await db.query('UPDATE life_orders SET application_status = $1 WHERE id = $2', ['splitted', order.id]);
}

module.exports = {
  handleCommissions
};
