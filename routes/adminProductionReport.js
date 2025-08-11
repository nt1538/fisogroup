// routes/adminProductionReport.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // your pg pool/client

function buildDateWhere(range) {
  if (!range || range === 'all') return '';
  if (range === 'ytd')        return `commission_distribution_date >= date_trunc('year', NOW())`;
  if (range === 'rolling_3')  return `commission_distribution_date >= NOW() - INTERVAL '3 months'`;
  if (range === 'rolling_12') return `commission_distribution_date >= NOW() - INTERVAL '12 months'`;
  return '';
}

// Build introducer maps (id -> directName, topName) and a memoized downline function
async function getHierarchyHelpers() {
  const { rows: users } = await db.query(`SELECT id, name, introducer_id FROM users`);
  const byId = new Map(users.map(u => [u.id, u]));
  const children = new Map(); // introducer_id -> [child ids]
  users.forEach(u => {
    if (!u.introducer_id) return;
    if (!children.has(u.introducer_id)) children.set(u.introducer_id, []);
    children.get(u.introducer_id).push(u.id);
  });

  const directNameById = new Map(
    users.map(u => [u.id, byId.get(u.introducer_id)?.name || null])
  );

  const topNameById = new Map();
  for (const u of users) {
    let cur = u;
    while (cur?.introducer_id && byId.get(cur.introducer_id)) {
      cur = byId.get(cur.introducer_id);
    }
    topNameById.set(u.id, cur?.name || u.name);
  }

  // Memoized DFS to collect all descendants (downline) for a user id
  const downlineMemo = new Map();
  function getDownlineIds(rootId) {
    if (downlineMemo.has(rootId)) return downlineMemo.get(rootId);
    const out = [];
    const stack = [...(children.get(rootId) || [])];
    while (stack.length) {
      const id = stack.pop();
      out.push(id);
      const kids = children.get(id);
      if (kids?.length) stack.push(...kids);
    }
    downlineMemo.set(rootId, out);
    return out;
  }

  return { directNameById, topNameById, getDownlineIds };
}

// GET /admin/reports/production?range=all|ytd|rolling_3|rolling_12&sort=...&dir=asc|desc
router.get('/production', async (req, res) => {
  try {
    const { range = 'all', sort = '', dir = 'desc' } = req.query;
    const sortKey = ['personal_production', 'personal_commission', 'team_production', 'team_commission'].includes(sort) ? sort : '';
    const sortDir = (dir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where = buildDateWhere(range);
    const whereSQL = where ? `WHERE ${where}` : '';

    // 1) PERSONAL PRODUCTION (range-based) from commission tables, order_type = personal commission
    const personalProdWhere = [
      where,
      `(LOWER(order_type) IN ('personal commission','personal_commission'))`
    ].filter(Boolean).join(' AND ');
    const personalProdWhereSQL = personalProdWhere ? `WHERE ${personalProdWhere}` : '';

    const { rows: lifeBase } = await db.query(`
      SELECT user_id, COALESCE(SUM(target_premium), 0)::numeric AS sum_base
      FROM commission_life
      ${personalProdWhereSQL}
      GROUP BY user_id
    `);

    const { rows: annBase } = await db.query(`
      SELECT user_id, COALESCE(SUM(flex_premium), 0)::numeric AS sum_base
      FROM commission_annuity
      ${personalProdWhereSQL}
      GROUP BY user_id
    `);

    const personalBaseMap = new Map(); // user_id -> base sum
    lifeBase.forEach(r => personalBaseMap.set(r.user_id, Number(r.sum_base)));
    annBase.forEach(r => personalBaseMap.set(r.user_id, (personalBaseMap.get(r.user_id) || 0) + Number(r.sum_base)));

    // 2) PERSONAL COMMISSION (range-based): sum of all commissions from commission tables
    const { rows: lifeComm } = await db.query(`
      SELECT user_id, COALESCE(SUM(COALESCE(commission_amount, commission_from_carrier)), 0)::numeric AS sum_comm
      FROM commission_life
      ${whereSQL}
      GROUP BY user_id
    `);

    const { rows: annComm } = await db.query(`
      SELECT user_id, COALESCE(SUM(COALESCE(commission_amount, commission_from_carrier)), 0)::numeric AS sum_comm
      FROM commission_annuity
      ${whereSQL}
      GROUP BY user_id
    `);

    const personalCommMap = new Map(); // user_id -> commission in range
    lifeComm.forEach(r => personalCommMap.set(r.user_id, Number(r.sum_comm)));
    annComm.forEach(r => personalCommMap.set(r.user_id, (personalCommMap.get(r.user_id) || 0) + Number(r.sum_comm)));

    // 3) BASE USER INFO (team_production stays from users.team_profit - rolling 12)
    const { rows: userRows } = await db.query(`
      SELECT
        u.id,
        u.name,
        u.hierarchy_level,
        COALESCE(u.team_profit, 0)::numeric AS team_production
      FROM users u
    `);

    // 4) Introducer helpers + downline traversal
    const { directNameById, topNameById, getDownlineIds } = await getHierarchyHelpers();

    // 5) TEAM COMMISSION (range-based): sum of downline commissions (exclude own)
    //    We already have per-user commission in personalCommMap; aggregate those for descendants.
    const data = userRows.map(u => {
      const personal_production  = Number((personalBaseMap.get(u.id) || 0).toFixed(2));
      const personal_commission  = Number((personalCommMap.get(u.id) || 0).toFixed(2));

      const downIds = getDownlineIds(u.id);
      let team_commission_sum = 0;
      for (const did of downIds) {
        team_commission_sum += Number(personalCommMap.get(did) || 0);
      }

      return {
        id: u.id,
        name: u.name,
        hierarchy_level: u.hierarchy_level,
        personal_production,
        personal_commission,                                   // range-based from commission tables
        team_production: Number(Number(u.team_production).toFixed(2)), // rolling 12 (precomputed)
        team_commission: Number(team_commission_sum.toFixed(2)),       // range-based from downline commission
        direct_introducer: directNameById.get(u.id) || null,
        top_introducer: topNameById.get(u.id) || null,
      };
    });

    // Optional sorting (client can also sort, but this is convenient)
    if (sortKey) {
      data.sort((a, b) => {
        const av = Number(a[sortKey]) || 0;
        const bv = Number(b[sortKey]) || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    }

    res.json(data);
  } catch (err) {
    console.error('production report error:', err);
    res.status(500).json({ error: 'Failed to load production report' });
  }
});

module.exports = router;
