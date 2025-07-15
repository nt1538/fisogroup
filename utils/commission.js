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

async function updateTeamProfit(userId, amount) {
  const hierarchy = await getHierarchy(userId);
  const idsToUpdate = hierarchy.map(u => u.id).concat(userId);
  for (const uid of idsToUpdate) {
    await db.query('UPDATE users SET team_profit = team_profit + $1 WHERE id = $2', [amount, uid]);
  }
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
      user_id, name, national_producer_number, hierarchy_level,
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

// 拆段后分发级差佣金
async function distributeLevelDifference(order, baseAmount, chart, parentId, segmentProfit, hierarchy) {
  const employeeLevel = reconcileLevel(segmentProfit, order.hierarchy_level, chart);
  const employeePercent = getLevelPercentByTitle(employeeLevel, chart);

  for (const u of hierarchy) {
    const uPercent = getLevelPercentByTitle(u.hierarchy_level, chart);
    const diff = uPercent - employeePercent;

    if (diff > 0.01) {
      const diffAmount = baseAmount * (diff / 100);
      await insertCommissionOrder(order, u, 'Level Difference', diff, diffAmount, `Level Diff from ${order.name}`, parentId);
    }
  }
}

// 统一发放代际佣金
async function distributeGenerationOverride(order, chart, parentId) {
  let currentId = order.user_id;
  let generation = 0;
  while (generation < 3) {
    const res = await db.query('SELECT id, name, national_producer_number, introducer_id FROM users WHERE id = $1', [currentId]);
    if (!res.rows.length) break;
    const currentUser = res.rows[0];
    if (!currentUser.introducer_id) break;

    const uRes = await db.query('SELECT * FROM users WHERE id = $1', [currentUser.introducer_id]);
    if (!uRes.rows.length) break;
    const u = uRes.rows[0];

    const overridePercent = generation === 0 ? 5 : generation === 1 ? 3 : 1;
    const overrideAmount = parseFloat(order.commission_from_carrier) * (overridePercent / 100);
    if (overrideAmount > 0.01) {
      await insertCommissionOrder(order, u, 'Generation Override', overridePercent, overrideAmount, `Generation ${generation + 1}`, parentId);
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
  const segments = splitPoints ? [0, ...splitPoints, baseAmount] : [0, baseAmount];
  let totalProfitAdded = 0;

  for (let i = 0; i < segments.length - 1; i++) {
    const segmentAmount = segments[i + 1] - segments[i];
    const segmentProfit = profitBefore + segments[i];
    const level = reconcileLevel(segmentProfit, user.hierarchy_level, chart);
    const percent = getLevelPercentByTitle(level, chart);
    const commissionAmount = segmentAmount * (percent / 100);

    // 插入个人佣金
    await insertCommissionOrder(order, user, 'Personal Commission', percent, commissionAmount, `Segment ${i + 1}`, order.id);

    // 更新 profit 和 team_profit
    totalProfitAdded += segmentAmount;
    await updateTeamProfit(userId, segmentAmount);
    await db.query('UPDATE users SET profit = profit + $1, hierarchy_level = $2 WHERE id = $3', [segmentAmount, level, userId]);

    // 插入级差佣金
    await distributeLevelDifference(order, segmentAmount, chart, order.id, segmentProfit, hierarchy);
  }

  // 统一发放代际佣金
  await distributeGenerationOverride(order, chart, order.id);

  // 修改原始订单状态
  await db.query('UPDATE life_orders SET application_status = $1 WHERE id = $2', ['splitted', order.id]);
}

module.exports = {
  handleCommissions,
  getHierarchy
};
