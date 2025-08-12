// routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// --- helpers ---
function buildDateWhere(range, alias) {
  // alias = the table alias *used in the query* (e.g., 'cl' or 'ca')
  if (!range || range === 'all') return '1=1';
  if (range === 'ytd')       return `${alias}.commission_distribution_date >= date_trunc('year', NOW())`;
  if (range === 'rolling_3') return `${alias}.commission_distribution_date >= NOW() - INTERVAL '3 months'`;
  if (range === 'rolling_12')return `${alias}.commission_distribution_date >= NOW() - INTERVAL '12 months'`;
  return '1=1';
}

// recursively fetch the user's entire downline (including self)
async function getDownlineUsers(rootId) {
  const { rows } = await db.query(`
    WITH RECURSIVE downline AS (
      SELECT id, name, hierarchy_level, introducer_id
      FROM users
      WHERE id = $1
      UNION ALL
      SELECT u.id, u.name, u.hierarchy_level, u.introducer_id
      FROM users u
      JOIN downline d ON u.introducer_id = d.id
    )
    SELECT * FROM downline;
  `, [rootId]);
  return rows; // array of {id,name,hierarchy_level,introducer_id}
}

// aggregates per user for a given range from commission tables
async function getPersonalAggregatesForUsers(userIds, range) {
  if (!userIds.length) return new Map();

  const lifeSql = `
    SELECT cl.user_id,
           COALESCE(SUM(COALESCE(cl.target_premium,0) * COALESCE(cl.product_rate,100) / 100.0), 0)::numeric AS life_sum
    FROM commission_life cl
    WHERE cl.user_id = ANY($1)
      AND cl.order_type = 'Personal Commission'
      AND ${buildDateWhere(range, 'cl')}
    GROUP BY cl.user_id
  `;
  const annSql = `
    SELECT ca.user_id,
           COALESCE(SUM(COALESCE(ca.flex_premium,0) * COALESCE(ca.product_rate,6) / 100.0), 0)::numeric AS annuity_sum
    FROM commission_annuity ca
    WHERE ca.user_id = ANY($1)
      AND ca.order_type = 'Personal Commission'
      AND ${buildDateWhere(range, 'ca')}
    GROUP BY ca.user_id
  `;

  const [lifeRows, annRows] = await Promise.all([
    db.query(lifeSql, [userIds]).then(r => r.rows),
    db.query(annSql,  [userIds]).then(r => r.rows),
  ]);

  const map = new Map(); // user_id -> { personal_life, personal_annuity }
  for (const r of lifeRows) {
    map.set(r.user_id, { personal_life: Number(r.life_sum) || 0, personal_annuity: 0 });
  }
  for (const r of annRows) {
    const prev = map.get(r.user_id) || { personal_life: 0, personal_annuity: 0 };
    prev.personal_annuity += Number(r.annuity_sum) || 0;
    map.set(r.user_id, prev);
  }
  return map;
}

// build tree structure from flat downline results

function buildTree(rows) {
  const byId = new Map(rows.map(u => [u.id, { ...u, children: [] }]));
  let root = null;
  for (const node of byId.values()) {
    if (node.introducer_id && byId.has(node.introducer_id)) {
      byId.get(node.introducer_id).children.push(node);
    } else {
      if (!root) root = node;
    }
  }
  return root;
}

// Post-order roll-up: attach personal sums, compute team (self + all descendants)
function attachTeamSums(root, personalMap) {
  function dfs(node) {
    const personal = personalMap.get(node.id) || { personal_life: 0, personal_annuity: 0 };
    let teamLife = personal.personal_life;
    let teamAnn  = personal.personal_annuity;

    for (const child of node.children || []) {
      const childTotals = dfs(child);
      teamLife += childTotals.team_life_sum;
      teamAnn  += childTotals.team_annuity_sum;
    }

    node.personal_life_sum   = Number(personal.personal_life.toFixed(2));
    node.personal_annuity_sum= Number(personal.personal_annuity.toFixed(2));
    node.life_sum            = Number(teamLife.toFixed(2));     // << TEAM life
    node.annuity_sum         = Number(teamAnn.toFixed(2));      // << TEAM annuity
    node.total_sum           = Number((teamLife + teamAnn).toFixed(2));
    return { team_life_sum: teamLife, team_annuity_sum: teamAnn };
  }
  return dfs(root);
}

// ========== Routes ==========

// GET /api/reports/my-team-production
router.get('/my-team-production', verifyToken, async (req, res) => {
  try {
    const { range = 'all' } = req.query;
    const rootId = req.user.id;

    const downline = await getDownlineUsers(rootId);
    const ids = downline.map(u => u.id);

    const personalMap = await getPersonalAggregatesForUsers(ids, range);
    const tree = buildTree(downline);
    const totals = attachTeamSums(tree, personalMap); // fills sums on nodes

    const totalLife = Number(totals.team_life_sum.toFixed(2));
    const totalAnnuity = Number(totals.team_annuity_sum.toFixed(2));
    const grandTotal = Number((totalLife + totalAnnuity).toFixed(2));

    res.json({
      range,
      totals: { totalLife, totalAnnuity, grandTotal },
      tree
    });
  } catch (err) {
    console.error('my-team-production error:', err);
    res.status(500).json({ error: 'Failed to load team production' });
  }
});

// GET /api/reports/user-production-details?id=...&range=...
router.get('/user-production-details', verifyToken, async (req, res) => {
  try {
    const { id, range = 'all' } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const whereLife = buildDateWhere(range, 'cl');
    const whereAnn = buildDateWhere(range, 'ca');

    // life orders for this user
    const { rows: life } = await db.query(`
      SELECT cl.id, cl.user_id, cl.full_name, cl.national_producer_number, cl.hierarchy_level,
             cl.commission_percent, cl.commission_amount, cl.carrier_name, cl.product_name,
             cl.application_date, cl.policy_number, cl.insured_name, cl.writing_agent,
             cl.face_amount, cl.target_premium, cl.product_rate, cl.initial_premium,
             cl.split_percent, cl.split_with_id, cl.application_status, cl.mra_status, cl.order_type
      FROM commission_life cl
      WHERE cl.user_id = $1 AND ${whereLife}
      AND cl.order_type = 'Personal Commission'
      ORDER BY cl.application_date DESC NULLS LAST, cl.id DESC
    `, [id]);

    // annuity orders for this user
    const { rows: annuity } = await db.query(`
      SELECT ca.id, ca.user_id, ca.full_name, ca.national_producer_number, ca.hierarchy_level,
             ca.commission_percent, ca.commission_amount, ca.carrier_name, ca.product_name,
             ca.application_date, ca.policy_number, ca.insured_name, ca.writing_agent,
             ca.initial_premium, ca.flex_premium, ca.product_rate,
             ca.split_percent, ca.split_with_id, ca.application_status, ca.mra_status, ca.order_type
      FROM commission_annuity ca
      WHERE ca.user_id = $1 AND ${whereAnn}
      AND ca.order_type = 'Personal Commission'
      ORDER BY ca.application_date DESC NULLS LAST, ca.id DESC
    `, [id]);

    res.json({ life, annuity });
  } catch (err) {
    console.error('user-production-details error:', err);
    res.status(500).json({ error: 'Failed to load user production details' });
  }
});

module.exports = router;
