// cron/rebuildTeamProfits.js
const pool = require('../db');

// Return [self, upline1, upline2, ...] (no levels changed here)
async function getUplineChain(userId) {
  const chain = [];
  const seen = new Set();
  let current = userId;

  while (current && !seen.has(current)) {
    seen.add(current);
    const { rows } = await pool.query(
      'SELECT id, introducer_id FROM users WHERE id = $1',
      [current]
    );
    if (!rows.length) break;
    chain.push(rows[0].id);
    current = rows[0].introducer_id || null;
  }

  return chain;
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function rebuildTeamProfits() {
  const client = await pool.connect();
  try {
    console.log('🛠 Rebuilding team_profit (rolling 12 months) — crediting writer and uplines, leaving levels unchanged...');

    // 1) Pull effective production from saved_* within 12 months
    const { rows: life } = await client.query(`
      SELECT user_id,
             COALESCE(target_premium, 0)::numeric AS base,
             COALESCE(product_rate, 100)::numeric AS rate
      FROM saved_life_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
      AND LOWER(application_status) = 'distributed'
    `);

    const { rows: annu } = await client.query(`
      SELECT user_id,
             COALESCE(flex_premium, 0)::numeric AS base,
             COALESCE(product_rate, 6)::numeric   AS rate
      FROM saved_annuity_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
      AND LOWER(application_status) = 'distributed'
    `);

    // 2) Aggregate production by user including uplines
    //    teamTotals[id] = sum of all effective credits (writer + every upline)
    const teamTotals = new Map();

    async function creditChain(userId, credit) {
      if (!userId || credit <= 0) return;
      const chain = await getUplineChain(userId);
      for (const uid of chain) {
        teamTotals.set(uid, safeNum(teamTotals.get(uid), 0) + credit);
      }
    }

    // Effective production = base * rate%
    for (const r of life) {
      const base = safeNum(r.base);
      const rate = safeNum(r.rate, 100);
      const credit = (base * rate) / 100;
      await creditChain(r.user_id, credit);
    }
    for (const r of annu) {
      const base = safeNum(r.base);
      const rate = safeNum(r.rate, 6);
      const credit = (base * rate) / 100;
      await creditChain(r.user_id, credit);
    }

    // 3) Zero everyone first, then set computed totals
    await client.query('BEGIN');
    await client.query('UPDATE users SET team_profit = 0');

    // Batch updates (avoid gigantic single query)
    for (const [userId, total] of teamTotals.entries()) {
      const val = Number(total.toFixed(2));
      await client.query(
        'UPDATE users SET team_profit = $1 WHERE id = $2',
        [val, userId]
      );
    }

    // 4) IMPORTANT: Do NOT touch hierarchy_level here
    await client.query('COMMIT');

    console.log(`✅ Rebuild done. Updated team_profit for ${teamTotals.size} users (levels unchanged).`);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('❌ Error rebuilding team profits:', err);
  } finally {
    client.release();
  }
}

module.exports = { rebuildTeamProfits };
