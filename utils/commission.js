const db = require('../db');
const { resolveProductForOrder } = require('../utils/productResolver')

// 获取佣金等级表
async function getCommissionChart() {
  const res = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return res.rows;
}

function reconcileLevel(teamProfit, currentLevel, chart) {
  let currentIndex = chart.findIndex(row => row.title === currentLevel);
  if (currentIndex === -1) return currentLevel;

  // 连续晋升直到 team_profit 不满足更高等级门槛
  while (currentIndex + 1 < chart.length && teamProfit >= chart[currentIndex + 1].min_amount) {
    currentIndex++;
  }

  return chart[currentIndex].title;
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
    console.log(`User ${uid} updated team_profit to ${teamProfit}, new level: ${newLevel}`);
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
    const res = await db.query('SELECT id, introducer_id, hierarchy_level, name, national_producer_number FROM users WHERE id = $1', [currentId]);
    if (!res.rows.length) break;
    const u = res.rows[0];
    hierarchy.push(u);
    if (!u.introducer_id) break;
    currentId = u.introducer_id;
  }
  return hierarchy;
}

async function checkSplitPoints(order, chart, hierarchy) {
  // 0) order baseAmount (product_rate is %)
  const productRate = Number(order.product_rate ?? 100);
  const basePremiumRaw = order.flex_premium != null ? order.flex_premium : order.target_premium;
  const basePremium = Number(basePremiumRaw);
  const baseAmount =
    (Number.isFinite(basePremium) ? basePremium : 0) *
    (Number.isFinite(productRate) ? productRate : 100) / 100;

  if (baseAmount <= 0) return false;

  // 1) Self + uplines (unique by id)
  const userRes = await db.query('SELECT id, name FROM users WHERE id = $1', [order.user_id]);
  const self = userRes.rows[0];
  if (!self) return false;

  const allUsers = [];
  const seen = new Set();
  for (const u of [...(hierarchy || []), self]) {
    if (!u || !u.id || seen.has(u.id)) continue;
    seen.add(u.id);
    allUsers.push({ id: u.id, name: u.name || u.id });
  }

  // 2) fresh team_profit
  const ids = allUsers.map(u => u.id);
  const { rows: tps } = await db.query(
    `SELECT id, COALESCE(team_profit, 0)::numeric AS team_profit FROM users WHERE id = ANY($1)`,
    [ids]
  );
  const tpMap = new Map(tps.map(r => [r.id, Number(r.team_profit) || 0]));

  // 3) thresholds ascending
  const levels = (chart || [])
    .map(r => ({ title: r.title, min_amount: Number(r.min_amount) }))
    .filter(r => Number.isFinite(r.min_amount))
    .sort((a, b) => a.min_amount - b.min_amount);

  const splitSet = new Set();

  for (const u of allUsers) {
    const before = tpMap.get(u.id) ?? 0;
    const after = before + baseAmount;

    let currentIndex = -1;
    for (let i = 0; i < levels.length; i++) {
      if (before >= levels[i].min_amount) currentIndex = i; else break;
    }

    for (let i = currentIndex + 1; i < levels.length; i++) {
      const threshold = levels[i].min_amount;
      if (before < threshold && after >= threshold) {
        const offset = threshold - before; // exact self contribution needed
        if (offset > 0 && offset < baseAmount) {
          splitSet.add(offset);
          console.log(`[SPLIT] ${u.name} (before=${before}) crosses "${levels[i].title}" at self-offset ${offset}`);
        }
      }
    }
  }

  const sorted = [...splitSet].sort((a, b) => a - b);
  return sorted.length ? sorted : false;
}

async function insertCommissionOrder(order, user, type, percent, amount, explanation, parentId, tableName) {
  const isAnnuity = tableName.includes('annuity');

  let insertQuery;
  let values;

  if (isAnnuity) {
    insertQuery = `
      INSERT INTO ${tableName} (
        user_id, full_name, national_producer_number, hierarchy_level,
        commission_percent, commission_amount, carrier_name, product_name,
        application_date, commission_distribution_date, policy_effective_date, policy_number,
        insured_name, writing_agent, flex_premium, product_rate,
        initial_premium, commission_from_carrier, application_status, mra_status,
        order_type, parent_order_id, explanation,
        split_percent, split_with_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22,
        $23, $24, $25
      );
    `;
    values = [
      user.id, user.name, user.national_producer_number, user.hierarchy_level,
      percent, amount, order.carrier_name, order.product_name,
      order.application_date, order.commission_distribution_date, order.policy_effective_date, order.policy_number,
      order.insured_name, order.writing_agent, order.flex_premium, order.product_rate,
      order.initial_premium, order.commission_from_carrier, order.application_status, order.mra_status,
      type, parentId, explanation,
      order.split_percent, order.split_with_id
    ];
  } else {
    insertQuery = `
      INSERT INTO ${tableName} (
        user_id, full_name, national_producer_number, hierarchy_level,
        commission_percent, commission_amount, carrier_name, product_name,
        application_date, commission_distribution_date, policy_effective_date, policy_number,
        insured_name, writing_agent, face_amount, target_premium, product_rate,
        initial_premium, commission_from_carrier, application_status, mra_status,
        order_type, parent_order_id, explanation,
        split_percent, split_with_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26
      );
    `;
    values = [
      user.id, user.name, user.national_producer_number, user.hierarchy_level,
      percent, amount, order.carrier_name, order.product_name,
      order.application_date, order.commission_distribution_date, order.policy_effective_date, order.policy_number,
      order.insured_name, order.writing_agent, order.face_amount, order.target_premium, order.product_rate,
      order.initial_premium, order.commission_from_carrier, order.application_status, order.mra_status,
      type, parentId, explanation,
      order.split_percent, order.split_with_id
    ];
  }

  await db.query(insertQuery, values);
}

async function handleCommissions(order, userId, table_type) {
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return;

  // --- Resolve product meta (FISO/Excess/Renewal) ---
  const prod = await resolveProductForOrder({
    product_line: table_type,
    carrier_name: order.carrier_name,
    product_name: order.product_name,
    age_bracket: order.age_bracket || null
  }, db);

  const fisoRate    = prod ? Number(prod.fiso_rate    || 0) : 0;
  const excessRate  = prod ? Number(prod.excess_rate  || 0) : 0;
  const agent_excess_rate  = prod ? Number(prod.agent_excess_rate || 0) : 0; 
  const renewalRate = prod ? Number(prod.renewal_rate || 0) : 0;
  const agent_renewal_rate  = prod ? Number(prod.agent_excess_rate || 0) : 0; 

  // Expected-from-carrier info (life uses target; annuity uses base/flex)
  const baseForExpected = table_type === 'annuity'
    ? Number(order.flex_premium || 0)
    : Number(order.target_premium || 0);
  const expectedFromCarrier = baseForExpected * (fisoRate / 100); // for your logs if needed

  const chart = await getCommissionChart();
  const hierarchy = await getHierarchy(userId);

  const commissionTable = table_type === 'annuity' ? 'commission_annuity' : 'commission_life';
  const savedTable      = table_type === 'annuity' ? 'saved_annuity_orders' : 'saved_life_orders';
  const originalTable   = table_type === 'annuity' ? 'application_annuity' : 'application_life';

  const productInfo = `Excess ${excessRate}% | Renewals ${renewalRate}% | expected ${expectedFromCarrier}$ | actual ${order.commission_from_carrier || 0}$`;

  // Helper to process one logical segment (uses existing split logic)
  const processOneSegment = async (segOrder, segmentLabel) => {
    // Base (commissionable) amount for split logic
    let baseAmount;
    if (table_type === 'annuity') {
      baseAmount = parseFloat(segOrder.flex_premium || 0) * (segOrder.product_rate || 6) / 100;
    } else {
      baseAmount = parseFloat(segOrder.target_premium || 0) * (segOrder.product_rate || 100) / 100;
    }

    const splitPoints = await checkSplitPoints(segOrder, chart, hierarchy);
    const segments = splitPoints ? [0, ...splitPoints, baseAmount] : [0, baseAmount];

    let totalPersonalCommission = 0;
    const levelDiffMap = new Map();
    const genOverrideMap = new Map();

    for (let i = 0; i < segments.length - 1; i++) {
      const uRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      const uNow = uRes.rows[0];
      const profitBefore = parseFloat(uNow.team_profit || 0);
      const segAmount = segments[i + 1] - segments[i];

      const level = reconcileLevel(profitBefore, uNow.hierarchy_level, chart);
      const percent = getLevelPercentByTitle(level, chart);
      totalPersonalCommission += segAmount * (percent / 100);

      // uplines
      let currentId = userId;
      let generation = 0;
      const employeePercent = percent;
      const allowedLevels = ['Agency 1', 'Agency 2', 'Agency 3', 'Vice President'];

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

        if (generation < 3 && allowedLevels.includes(u.hierarchy_level)) {
          const overridePercent = generation === 0 ? 5 : generation === 1 ? 3 : 1;
          const overrideAmount = segAmount * (overridePercent / 100);
          const prev = genOverrideMap.get(u.id) || 0;
          genOverrideMap.set(u.id, prev + overrideAmount);
        }

        currentId = u.id;
        generation++;
      }

      // add production for this segment
      await updateTeamProfit(userId, segAmount);
    }

    // Insert merged personal + uplines for this segment
    const isAnnuity = commissionTable.includes('annuity');
    const premiumBase = isAnnuity
      ? (segOrder.flex_premium || 1) * (segOrder.product_rate || 6) / 100
      : (segOrder.target_premium || 1) * (segOrder.product_rate || 100) / 100;
    const personalPct = Math.round(totalPersonalCommission / premiumBase * 10000) / 100;

    await insertCommissionOrder(
      segOrder,
      user,
      'Personal Commission',
      personalPct,
      totalPersonalCommission,
      `Merged Personal Commission${segmentLabel ? ` (${segmentLabel})` : ''} — ${productInfo}`,
      segOrder.id || order.id,
      commissionTable
    );
    await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [totalPersonalCommission, user.id]);

    for (let [uid, amt] of levelDiffMap) {
      const res = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
      await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amt, uid]);
      if (res.rows.length) {
        await insertCommissionOrder(
          segOrder,
          res.rows[0],
          'Level Difference',
          Math.round(amt / premiumBase * 10000) / 100,
          amt,
          `Merged Level Difference${segmentLabel ? ` (${segmentLabel})` : ''} — ${productInfo}`,
          segOrder.id || order.id,
          commissionTable
        );
      }
    }

    for (let [uid, amt] of genOverrideMap) {
      const res = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
      await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amt, uid]);
      if (res.rows.length) {
        await insertCommissionOrder(
          segOrder,
          res.rows[0],
          'Generation Override',
          Math.round(amt / premiumBase * 10000) / 100,
          amt,
          `Merged Generation Override${segmentLabel ? ` (${segmentLabel})` : ''} — ${productInfo}`,
          segOrder.id || order.id,
          commissionTable
        );
      }
    }
  };

  const payExcessLikeRenewal = async (excessAmount) => {
    if (!excessAmount || excessAmount <= 0 || agent_excess_rate <= 0) return;

    // use agent excess rate for the commission row
    const excessOrderRow = {
      ...order,
      target_premium: excessAmount,
      product_rate: agent_excess_rate
    };

    const commissionAmount = (excessAmount * agent_excess_rate) / 100;
    const commissionPercent = agent_excess_rate;

    const explanation =
      `Excess — Agent Excess ${agent_excess_rate}% | FISO Excess ${excessRate}%`;

    await insertCommissionOrder(
      excessOrderRow,
      user,
      'Excess',
      commissionPercent,
      commissionAmount,
      explanation,
      order.id,
      commissionTable
    );

    // Only total earnings; NO team_profit updates
    await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [commissionAmount, user.id]);
  };

  // -------- Branch early by product line --------
  if (table_type === 'life') {
    // FIRST check initial vs target
    const initial = Math.max(Number(order.initial_premium || 0), 0);
    const target  = Math.max(Number(order.target_premium  || 0), 0);
    const productRate = Number(order.product_rate || 100);

    if (initial <= target) {
      // Use INITIAL (not target) at product rate
      const seg = { ...order, target_premium: initial, product_rate: productRate };
      await processOneSegment(seg, 'Base');
    } else {
      // initial > target → do Target first at product rate, then Excess at excess rate
      if (target > 0) {
        const baseSeg = { ...order, target_premium: target, product_rate: productRate };
        await processOneSegment(baseSeg, 'Base (to Target)');
      }

      const excessAmt = initial - target;
      if (excessAmt > 0) {
        await payExcessLikeRenewal(excessAmt);
      }
    }

    // Move application → saved_* after all life segments
    await db.query(`UPDATE ${originalTable} SET application_status = $1 WHERE id = $2`, ['distributed', order.id]);
    await db.query(`INSERT INTO ${savedTable} SELECT * FROM ${originalTable} WHERE id = $1`, [order.id]);
    await db.query(`DELETE FROM ${originalTable} WHERE id = $1`, [order.id]);
    return;
  }

  // --- Annuity unchanged (single segment at product_rate) ---
  let baseAmount = parseFloat(order.flex_premium || 0) * (order.product_rate || 6) / 100;
  const splitPoints = await checkSplitPoints(order, chart, hierarchy);
  const segments = splitPoints ? [0, ...splitPoints, baseAmount] : [0, baseAmount];

  let totalPersonalCommission = 0;
  const levelDiffMap = new Map();
  const genOverrideMap = new Map();

  for (let i = 0; i < segments.length - 1; i++) {
    const uRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const uNow = uRes.rows[0];
    const profitBefore = parseFloat(uNow.team_profit || 0);
    const segAmount = segments[i + 1] - segments[i];

    const level = reconcileLevel(profitBefore, uNow.hierarchy_level, chart);
    const percent = getLevelPercentByTitle(level, chart);
    totalPersonalCommission += segAmount * (percent / 100);

    let currentId = userId;
    let generation = 0;
    const employeePercent = percent;
    const allowedLevels = ['Agency 1', 'Agency 2', 'Agency 3', 'Vice President'];

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

      if (generation < 3 && allowedLevels.includes(u.hierarchy_level)) {
        const overridePercent = generation === 0 ? 5 : generation === 1 ? 3 : 1;
        const overrideAmount = segAmount * (overridePercent / 100);
        const prev = genOverrideMap.get(u.id) || 0;
        genOverrideMap.set(u.id, prev + overrideAmount);
      }

      currentId = u.id;
      generation++;
    }

    await updateTeamProfit(userId, segAmount);
  }

  const isAnnuity = commissionTable.includes('annuity');
  const premiumBase = isAnnuity
    ? (order.flex_premium || 1) * (order.product_rate || 6) / 100
    : (order.target_premium || 1) * (order.product_rate || 100) / 100;

  const personalPct = Math.round(totalPersonalCommission / premiumBase * 10000) / 100;

  await insertCommissionOrder(
    order,
    user,
    'Personal Commission',
    personalPct,
    totalPersonalCommission,
    `Merged Personal Commission — ${productInfo}`,
    order.id,
    commissionTable
  );
  await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [totalPersonalCommission, user.id]);

  for (let [uid, amt] of levelDiffMap) {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
    await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amt, uid]);
    if (res.rows.length) {
      await insertCommissionOrder(
        order,
        res.rows[0],
        'Level Difference',
        Math.round(amt / premiumBase * 10000) / 100,
        amt,
        `Merged Level Difference — ${productInfo}`,
        order.id,
        commissionTable
      );
    }
  }

  for (let [uid, amt] of genOverrideMap) {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
    await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amt, uid]);
    if (res.rows.length) {
      await insertCommissionOrder(
        order,
        res.rows[0],
        'Generation Override',
        Math.round(amt / premiumBase * 10000) / 100,
        amt,
        `Merged Generation Override — ${productInfo}`,
        order.id,
        commissionTable
      );
    }
  }

  await db.query(`UPDATE ${originalTable} SET application_status = $1 WHERE id = $2`, ['distributed', order.id]);
  await db.query(`INSERT INTO ${savedTable} SELECT * FROM ${originalTable} WHERE id = $1`, [order.id]);
  await db.query(`DELETE FROM ${originalTable} WHERE id = $1`, [order.id]);
}


module.exports = {
  handleCommissions,
  getHierarchy
};