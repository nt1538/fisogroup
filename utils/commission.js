const db = require('../db');

// 获取佣金等级表
async function getCommissionChart() {
  const res = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return res.rows;
}

// 根据当前等级与 profit 判断是否升级（只升不降）
function reconcileLevel(profit, currentLevel, chart) {
  let profitLevel = chart[0].title;

  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) {
      profitLevel = row.title;
      break;
    }
  }

  const currentIndex = chart.findIndex(row => row.title === currentLevel);
  const profitIndex = chart.findIndex(row => row.title === profitLevel);

  return profitIndex > currentIndex ? profitLevel : currentLevel;
}

// 获取等级对应提成百分比
function getLevelPercentByTitle(title, chart) {
  const row = chart.find(r => r.title === title);
  return row ? row.commission_percent : chart[0].commission_percent;
}

// 获取用户向上所有层级（不限制代数）
async function getHierarchy(userId) {
  const hierarchy = [];
  let currentId = userId;
  while (true) {
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

  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [order.user_id]);
  const self = userRes.rows[0];
  const allUsers = [...hierarchy, self];

  for (const u of allUsers) {
    const before = parseFloat(u.profit || 0);
    const after = before + baseAmount;
    profitMap.set(u.id, [before, after]);
    beforeLevels.set(u.id, reconcileLevel(before, u.hierarchy_level, chart));
    afterLevels.set(u.id, reconcileLevel(after, u.hierarchy_level, chart));
  }

  const points = new Set();

  for (const [id, [before, after]] of profitMap.entries()) {
    const user = allUsers.find(u => u.id === id);
    const currentLevelTitle = reconcileLevel(before, user.hierarchy_level, chart);
    const currentLevelObj = chart.find(c => c.title === currentLevelTitle);

    for (const row of chart) {
      if (
        row.min_amount > before &&
        row.min_amount > currentLevelObj.min_amount &&
        row.min_amount < after
      ) {
        points.add(row.min_amount - parseFloat(self.profit));
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
    user.id, user.name, user.national_producer_number, user.hierarchy_level,
    percent, amount, order.carrier_name, order.product_name,
    order.application_date, order.policy_number, order.face_amount, order.target_premium,
    order.initial_premium, order.commission_from_carrier, order.application_status, order.mra_status,
    type, parentId, explanation
  ]);

  await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amount, user.id]);
}

// 分发层级提成（级差 + 代际）
async function distributeUpline(order, baseAmount, chart, parentId) {
  let currentId = order.user_id;
  let generation = 0;

  const employeeRes = await db.query('SELECT id, hierarchy_level FROM users WHERE id = $1', [currentId]);
  const employeeLevel = employeeRes.rows[0].hierarchy_level;
  const employeePercent = getLevelPercentByTitle(employeeLevel, chart);

  while (true) {
    const res = await db.query('SELECT id, name, national_producer_number, profit, hierarchy_level, introducer_id FROM users WHERE id = $1', [currentId]);
    if (!res.rows.length) break;
    const currentUser = res.rows[0];
    if (!currentUser.introducer_id) break;

    const uRes = await db.query('SELECT * FROM users WHERE id = $1', [currentUser.introducer_id]);
    if (!uRes.rows.length) break;

    const u = uRes.rows[0];
    const uPercent = getLevelPercentByTitle(u.hierarchy_level, chart);
    const downPercent = generation === 0 ? employeePercent : getLevelPercentByTitle(currentUser.hierarchy_level, chart);
    const diff = uPercent - downPercent;

    if (diff > 0.01) {
      const diffAmount = baseAmount * (diff / 100);
      await insertCommissionOrder(order, u, 'Level Difference', diff, diffAmount, `Level Diff with ${currentUser.name}`, parentId);
    }

    if (generation < 3) {
      const overridePercent = generation === 0 ? 5 : generation === 1 ? 3 : 1;
      const overrideAmount = baseAmount * (overridePercent / 100);
      if (overrideAmount > 0.01) {
        await insertCommissionOrder(order, u, 'Generation Override', overridePercent, overrideAmount, `Generation ${generation + 1}`, parentId);
      }
    }

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
    const level = reconcileLevel(profitBefore, user.hierarchy_level, chart);
    const percent = getLevelPercentByTitle(level, chart);
    const amount = baseAmount * (percent / 100);
    await insertCommissionOrder(order, user, 'Personal Commission', percent, amount, 'Full Commission', order.id);
    await distributeUpline(order, baseAmount, chart, order.id);
    await db.query('UPDATE users SET profit = profit + $1, hierarchy_level = $2 WHERE id = $3', [baseAmount, level, userId]);
    await db.query('DELETE FROM life_orders WHERE id = $1', [order.id]);
    return;
  }

  const segments = [0, ...splitPoints, baseAmount];
  for (let i = 0; i < segments.length - 1; i++) {
    const segmentAmount = segments[i + 1] - segments[i];
    const segmentProfit = profitBefore + segments[i];
    const level = reconcileLevel(segmentProfit, user.hierarchy_level, chart);
    const percent = getLevelPercentByTitle(level, chart);
    const commissionAmount = segmentAmount * (percent / 100);

    await insertCommissionOrder(order, user, 'Personal Commission', percent, commissionAmount, `Segment ${i + 1}`, order.id);
    await distributeUpline(order, segmentAmount, chart, order.id);
    await db.query('UPDATE users SET profit = profit + $1, hierarchy_level = $2 WHERE id = $3', [segmentAmount, level, userId]);

    const updatedUserRes = await db.query('SELECT profit, hierarchy_level FROM users WHERE id = $1', [userId]);
    user.profit = parseFloat(updatedUserRes.rows[0].profit);
    user.hierarchy_level = updatedUserRes.rows[0].hierarchy_level;

    for (const h of hierarchy) {
      const hr = await db.query('SELECT profit FROM users WHERE id = $1', [h.id]);
      const p = parseFloat(hr.rows[0].profit || 0);
      const newL = reconcileLevel(p, h.hierarchy_level, chart);
      await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newL, h.id]);
    }
  }

  await db.query('UPDATE life_orders SET application_status = $1 WHERE id = $2', ['splitted', order.id]);
}

module.exports = {
  handleCommissions
};