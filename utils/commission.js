const db = require('../db');

// 获取佣金等级表
async function getCommissionChart() {
  const res = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return res.rows;
}

function reconcileLevel(teamProfit, currentLevel, chart) {
  const currentIndex = chart.findIndex(row => row.title === currentLevel);
  const currentLevelRow = chart[currentIndex];
  const nextLevelRow = chart[currentIndex + 1];

  // 如果没有更高等级了，保持当前等级
  if (!nextLevelRow) return currentLevel;

  // 如果 team_profit 达到下一等级门槛，则晋升
  if (teamProfit >= nextLevelRow.min_amount) {
    return nextLevelRow.title;
  }

  // 否则保持当前等级
  return currentLevel;
}



function getLevelPercentByTitle(title, chart) {
  const row = chart.find(r => r.title === title);
  return row ? row.commission_percent : chart[0].commission_percent;
}

async function updateTeamProfit(userId, amount) {
  const hierarchy = await getHierarchy(userId);
  const idsToUpdate = hierarchy.map(u => u.id); // 包括本人

  const chart = await getCommissionChart();

  for (const uid of idsToUpdate) {
    // 更新 team_profit
    await db.query('UPDATE users SET team_profit = team_profit + $1 WHERE id = $2', [amount, uid]);

    // 获取更新后的 team_profit 和当前等级
    const res = await db.query('SELECT team_profit, hierarchy_level FROM users WHERE id = $1', [uid]);
    if (res.rows.length === 0) continue;

    const teamProfit = parseFloat(res.rows[0].team_profit || 0);
    const currentLevel = res.rows[0].hierarchy_level;
    const newLevel = reconcileLevel(teamProfit, currentLevel, chart);

    // 若等级变更则更新
    if (newLevel !== currentLevel) {
      await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel, uid]);
    }
  }
}


async function getHierarchy(userId) {
  const hierarchy = [];
  let currentId = userId;
  while (true) {
    const res = await db.query('SELECT id, introducer_id, profit, hierarchy_level, name, national_producer_number FROM users WHERE id = $1', [currentId]);
    if (!res.rows.length) break;
    const u = res.rows[0];
    hierarchy.push(u);
    if (!u.introducer_id) break;
    currentId = u.introducer_id;
  }
  return hierarchy;
}

async function checkSplitPoints(order, chart, hierarchy) {
  const baseAmount = parseFloat(order.commission_from_carrier || 0);
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [order.user_id]);
  const self = userRes.rows[0];
  const allUsers = [...hierarchy, self];
  const splitSet = new Set();

  for (const u of allUsers) {
    const before = parseFloat(u.team_profit || 0);
    const after = before + baseAmount;

    const currentIndex = chart.findIndex(c => c.title === u.hierarchy_level);
    if (currentIndex === -1) continue;

    for (let i = currentIndex + 1; i < chart.length; i++) {
      const threshold = chart[i].min_amount;

      if (before < threshold && after >= threshold) {
        // 基于发起订单者自身的 team_profit 计算 offset 拆分点
        const offset = threshold - parseFloat(self.team_profit || 0);
        if (offset > 0 && offset < baseAmount) {
          splitSet.add(offset);

          // 打印调试信息
          //console.log(`[SPLIT] User ${u.name} (${u.hierarchy_level}) will cross ${chart[i].title} at offset = ${offset}`);
        }
      }
    }
  }

  const sorted = [...splitSet].sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : false;
}


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

  let totalPersonalCommission = 0;
  const levelDiffMap = new Map();
  const genOverrideMap = new Map();
  console.log(segments);
  for (let i = 0; i < segments.length - 1; i++) {
    const segAmount = segments[i + 1] - segments[i];
    const segProfit = profitBefore + segments[i];
    const level = reconcileLevel(segProfit, user.hierarchy_level, chart);
    const percent = getLevelPercentByTitle(level, chart);
    totalPersonalCommission += segAmount * (percent / 100);

    await updateTeamProfit(userId, segAmount);
    await db.query('UPDATE users SET profit = profit + $1, hierarchy_level = $2 WHERE id = $3', [segAmount, level, userId]);

    let currentId = userId;
    let generation = 0;
    const employeePercent = percent;

    while (true) {
      const res = await db.query('SELECT * FROM users WHERE id = $1', [currentId]);
      const currUser = res.rows[0];
      if (!currUser || !currUser.introducer_id) break;

      const upRes = await db.query('SELECT * FROM users WHERE id = $1', [currUser.introducer_id]);
      const u = upRes.rows[0];
      if (!u) break;

      const uPercent = getLevelPercentByTitle(u.hierarchy_level, chart);
      const downPercent = generation === 0 ? employeePercent : getLevelPercentByTitle(currUser.hierarchy_level, chart);
      const diff = uPercent - downPercent;
      if (diff > 0.01) {
        const prev = levelDiffMap.get(u.id) || 0;
        levelDiffMap.set(u.id, prev + segAmount * (diff / 100));
      }

      if (generation < 3) {
        const overridePercent = generation === 0 ? 5 : generation === 1 ? 3 : 1;
        const overrideAmount = segAmount * (overridePercent / 100);
        const prev = genOverrideMap.get(u.id) || 0;
        genOverrideMap.set(u.id, prev + overrideAmount);
      }

      currentId = u.id;
      generation++;
    }
  }

  // Insert merged commissions
  await insertCommissionOrder(order, user, 'Personal Commission', null, totalPersonalCommission, 'Merged Personal Commission', order.id);
  for (let [uid, amt] of levelDiffMap) {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
    if (res.rows.length) {
      await insertCommissionOrder(order, res.rows[0], 'Level Difference', null, amt, 'Merged Level Difference', order.id);
    }
  }
  for (let [uid, amt] of genOverrideMap) {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
    if (res.rows.length) {
      await insertCommissionOrder(order, res.rows[0], 'Generation Override', null, amt, 'Merged Generation Override', order.id);
    }
  }

  await db.query('UPDATE life_orders SET application_status = $1 WHERE id = $2', ['Distributed', order.id]);
}

module.exports = {
  handleCommissions,
  getHierarchy
};