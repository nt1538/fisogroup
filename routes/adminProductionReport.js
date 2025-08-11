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
    while (cur?.introducer_id && byId.get(cur.introducer_id)) cur = byId.get(cur.introducer_id);
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

    // 1) PERSONAL PRODUCTION (range-based) from commission tables, order_type = personal commission,
    //    and base premiums multiplied by product_rate / 100 (defaults: 100 life, 6 annuity).
    const personalProdWhere = [
      where,
      `(LOWER(order_type) IN ('personal commission','personal_commission'))`
    ].filter(Boolean).join(' AND ');
    const personalProdWhereSQL = personalProdWhere ? `WHERE ${personalProdWhere}` : '';

    const { rows: lifeBase } = await db.query(`
      SELECT
        user_id,
        COALESCE(
          SUM( (target_premium::numeric) * (COALESCE(product_rate, 100)::numeric / 100.0) ),
          0
        )::numeric AS sum_base
      FROM commission_life
      ${personalProdWhereSQL}
      GROUP BY user_id
    `);

    const { rows: annBase } = await db.query(`
      SELECT
        user_id,
        COALESCE(
          SUM( (flex_premium::numeric) * (COALESCE(product_rate, 6)::numeric / 100.0) ),
          0
        )::numeric AS sum_base
      FROM commission_annuity
      ${personalProdWhereSQL}
      GROUP BY user_id
    `);

    const personalProdMap = new Map(); // user_id -> weighted base sum
    lifeBase.forEach(r => personalProdMap.set(r.user_id, Number(r.sum_base)));
    annBase.forEach(r => personalProdMap.set(r.user_id, (personalProdMap.get(r.user_id) || 0) + Number(r.sum_base)));

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

    // 3) Base users
    const { rows: userRows } = await db.query(`
      SELECT u.id, u.name, u.hierarchy_level
      FROM users u
    `);

    // 4) Hierarchy helpers
    const { directNameById, topNameById, getDownlineIds } = await getHierarchyHelpers();

    // 5) Build rows: team_* are sums of downline personal_* (exclude self)
    const data = userRows.map(u => {
      const personal_production = Number((personalProdMap.get(u.id) || 0).toFixed(2));
      const personal_commission = Number((personalCommMap.get(u.id) || 0).toFixed(2));

      const downIds = getDownlineIds(u.id);
      let team_production_sum = 0;
      let team_commission_sum = 0;

      for (const did of downIds) {
        team_production_sum += Number(personalProdMap.get(did) || 0);
        team_commission_sum += Number(personalCommMap.get(did) || 0);
      }

      return {
        id: u.id,
        name: u.name,
        hierarchy_level: u.hierarchy_level,
        personal_production,
        personal_commission,
        team_production: Number(team_production_sum.toFixed(2)),
        team_commission: Number(team_commission_sum.toFixed(2)),
        direct_introducer: directNameById.get(u.id) || null,
        top_introducer: topNameById.get(u.id) || null,
      };
    });

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
