// routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// --- helpers ---
function buildDateWhere(range, alias = 'c') {
  // alias is the table alias that has commission_distribution_date in commission_* tables
  if (!range || range === 'all') return '1=1';
  if (range === 'ytd') return `${alias}.commission_distribution_date >= date_trunc('year', NOW())`;
  if (range === 'rolling_3') return `${alias}.commission_distribution_date >= NOW() - INTERVAL '3 months'`;
  if (range === 'rolling_12') return `${alias}.commission_distribution_date >= NOW() - INTERVAL '12 months'`;
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
async function getAggregatesForUsers(userIds, range) {
  if (!userIds.length) return { map: new Map(), totals: { life: 0, annuity: 0 } };
  const whereLife = buildDateWhere(range, 'cl');
  const whereAnn = buildDateWhere(range, 'ca');

  // Life: sum(target_premium * (product_rate/100))
  const { rows: lifeRows } = await db.query(`
    SELECT cl.user_id,
           COALESCE(SUM( (COALESCE(cl.target_premium,0) * COALESCE(cl.product_rate,100) / 100.0) ), 0)::numeric AS life_sum
    FROM commission_life cl
    WHERE cl.user_id = ANY($1)
    AND cl.order_type = 'Personal Commission'
      AND ${whereLife}
    GROUP BY cl.user_id
  `, [userIds]);

  // Annuity: sum(flex_premium * (product_rate/100))
  const { rows: annRows } = await db.query(`
    SELECT ca.user_id,
           COALESCE(SUM( (COALESCE(ca.flex_premium,0) * COALESCE(ca.product_rate,6) / 100.0) ), 0)::numeric AS annuity_sum
    FROM commission_annuity ca
    WHERE ca.user_id = ANY($1)
    AND cl.order_type = 'Personal Commission'
      AND ${whereAnn}
    GROUP BY ca.user_id
  `, [userIds]);

  const map = new Map();
  let totalLife = 0, totalAnnuity = 0;

  for (const r of lifeRows) {
    const life = Number(r.life_sum) || 0;
    map.set(r.user_id, { life_sum: life, annuity_sum: 0 });
    totalLife += life;
  }
  for (const r of annRows) {
    const a = Number(r.annuity_sum) || 0;
    const prev = map.get(r.user_id) || { life_sum: 0, annuity_sum: 0 };
    prev.annuity_sum += a;
    map.set(r.user_id, prev);
    totalAnnuity += a;
  }

  return { map, totals: { life: Number(totalLife.toFixed(2)), annuity: Number(totalAnnuity.toFixed(2)) } };
}

// build tree structure from flat downline results
function buildTree(rows, aggregates) {
  const byId = new Map(rows.map(u => [u.id, { ...u, children: [] }]));
  // attach sums
  for (const [id, sums] of aggregates.map) {
    if (byId.has(id)) {
      byId.get(id).life_sum = Number((sums.life_sum || 0).toFixed(2));
      byId.get(id).annuity_sum = Number((sums.annuity_sum || 0).toFixed(2));
      byId.get(id).total_sum = Number((byId.get(id).life_sum + byId.get(id).annuity_sum).toFixed(2));
    }
  }
  // default 0 when missing
  for (const node of byId.values()) {
    node.life_sum = Number((node.life_sum || 0).toFixed(2));
    node.annuity_sum = Number((node.annuity_sum || 0).toFixed(2));
    node.total_sum = Number((node.total_sum || (node.life_sum + node.annuity_sum)).toFixed(2));
  }

  let root = null;
  for (const node of byId.values()) {
    if (node.introducer_id && byId.has(node.introducer_id)) {
      byId.get(node.introducer_id).children.push(node);
    } else {
      // no introducer or not in set => treat as root (should be exactly the requested user)
      if (!root) root = node;
    }
  }
  return root;
}

// ========== Routes ==========

// GET /api/reports/my-team-production
router.get('/my-team-production', verifyToken, async (req, res) => {
  try {
    const { range = 'all' } = req.query;
    const rootId = req.user.id; // requires verifyToken to set req.user

    const downline = await getDownlineUsers(rootId);
    const ids = downline.map(u => u.id);

    const aggregates = await getAggregatesForUsers(ids, range);
    const tree = buildTree(downline, aggregates);

    const totalLife = aggregates.totals.life;
    const totalAnnuity = aggregates.totals.annuity;
    const grandTotal = Number((totalLife + totalAnnuity).toFixed(2));

    res.json({
      range,
      totals: {
        totalLife,
        totalAnnuity,
        grandTotal
      },
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
      AND cl.order_type = 'Personal Commission'
      ORDER BY ca.application_date DESC NULLS LAST, ca.id DESC
    `, [id]);

    res.json({ life, annuity });
  } catch (err) {
    console.error('user-production-details error:', err);
    res.status(500).json({ error: 'Failed to load user production details' });
  }
});

module.exports = router;
