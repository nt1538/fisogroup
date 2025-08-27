// routes/adminExports.js
const router = require('express').Router();
const ExcelJS = require('exceljs');
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// small helper
function toISODate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function getDateRange(range) {
  const now = new Date();
  const end = toISODate(now);
  if (range === 'ytd') {
    const start = `${now.getFullYear()}-01-01`;
    return { start, end };
  }
  if (range === 'rolling_3') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3);
    return { start: toISODate(d), end };
  }
  if (range === 'rolling_12') {
    const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
    return { start: toISODate(d), end };
  }
  return null; // 'all'
}

// ---------- COMMISSION EXPORT ----------
router.get('/exports/commission.xlsx', verifyToken, verifyAdmin, async (req, res) => {
  const { user_name, policy_number, range, start_date, end_date } = req.query;

  // Build filters used on the page (by commission_distribution_date)
  const clauses = [];
  const params = [];
  let idx = 1;

  if (user_name) {
    clauses.push(`u.name ILIKE $${idx++}`);
    params.push(`%${user_name}%`);
  }
  if (policy_number) {
    clauses.push(`o.policy_number ILIKE $${idx++}`);
    params.push(`%${policy_number}%`);
  }

  if (range && range !== 'all') {
    const r = getDateRange(range);
    if (r) {
      clauses.push(`o.commission_distribution_date BETWEEN $${idx++} AND $${idx++}`);
      params.push(r.start, r.end);
    }
  } else if (start_date && end_date) {
    clauses.push(`o.commission_distribution_date BETWEEN $${idx++} AND $${idx++}`);
    params.push(start_date, end_date);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  // union life + annuity to mirror your table
  const sql = `
    SELECT
      o.user_id,
      u.name AS user_name,
      o.hierarchy_level,
      o.commission_distribution_date,
      'commission_life' AS table_type,
      o.carrier_name, o.product_name, o.policy_number,
      o.insured_name, o.writing_agent,
      o.face_amount,
      o.initial_premium,
      o.target_premium,
      NULL::numeric AS flex_premium,
      o.commission_from_carrier,
      o.product_rate,
      o.split_percent, o.split_with_id,
      o.commission_percent, o.commission_amount,
      o.order_type,
      o.mra_status,
      o.explanation,
      o.policy_effective_date
    FROM commission_life o
    JOIN users u ON u.id = o.user_id
    ${where}

    UNION ALL

    SELECT
      o.user_id,
      u.name AS user_name,
      o.hierarchy_level,
      o.commission_distribution_date,
      'commission_annuity' AS table_type,
      o.carrier_name, o.product_name, o.policy_number,
      o.insured_name, o.writing_agent,
      NULL::numeric AS face_amount,
      o.initial_premium,
      NULL::numeric AS target_premium,
      o.flex_premium,
      o.commission_from_carrier,
      o.product_rate,
      o.split_percent, o.split_with_id,
      o.commission_percent, o.commission_amount,
      o.order_type,
      o.mra_status,
      o.explanation,
      o.policy_effective_date
    FROM commission_annuity o
    JOIN users u ON u.id = o.user_id
    ${where}

    ORDER BY commission_distribution_date DESC
  `;

  try {
    const { rows } = await pool.query(sql, [...params, ...params]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Commission');

    ws.columns = [
      { header: 'User ID', key: 'user_id', width: 10 },
      { header: 'Payee Name', key: 'user_name', width: 24 },
      { header: 'Level', key: 'hierarchy_level', width: 16 },
      { header: 'Commission Date', key: 'commission_distribution_date', width: 18 },
      { header: 'Product Type', key: 'table_type', width: 18 },
      { header: 'Carrier', key: 'carrier_name', width: 20 },
      { header: 'Product Name', key: 'product_name', width: 28 },
      { header: 'Policy Number', key: 'policy_number', width: 18 },
      { header: 'Insured Name', key: 'insured_name', width: 22 },
      { header: 'Writing Agent', key: 'writing_agent', width: 22 },
      { header: 'Face Amount', key: 'face_amount', width: 16 },
      { header: 'Paid Premium', key: 'initial_premium', width: 16 },
      { header: 'Target Premium', key: 'target_premium', width: 16 },
      { header: 'Base Premium (Flex)', key: 'flex_premium', width: 18 },
      { header: 'Commission From Carrier', key: 'commission_from_carrier', width: 24 },
      { header: 'Product Rate (%)', key: 'product_rate', width: 16 },
      { header: 'Split % (other)', key: 'split_percent', width: 14 },
      { header: 'Split With ID', key: 'split_with_id', width: 14 },
      { header: 'Commission %', key: 'commission_percent', width: 14 },
      { header: 'Commission Amount', key: 'commission_amount', width: 18 },
      { header: 'Commission Type', key: 'order_type', width: 18 },
      { header: 'Notes', key: 'mra_status', width: 16 },
      { header: 'Explanation', key: 'explanation', width: 40 },
      { header: 'Policy Effective', key: 'policy_effective_date', width: 18 },
    ];

    // add derived column if you want effective writing split:
    rows.forEach((r) => ws.addRow(r));

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="commission_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('Export commission.xlsx error', e);
    res.status(500).json({ error: 'Failed to build export' });
  }
});

// ---------- APPLICATION EXPORT ----------
router.get('/exports/application.xlsx', verifyToken, verifyAdmin, async (req, res) => {
  const { user_name, policy_number, range, start_date, end_date } = req.query;

  const clauses = [];
  const params = [];
  let idx = 1;

  if (user_name) {
    clauses.push(`u.name ILIKE $${idx++}`);
    params.push(`%${user_name}%`);
  }
  if (policy_number) {
    clauses.push(`o.policy_number ILIKE $${idx++}`);
    params.push(`%${policy_number}%`);
  }

  if (range && range !== 'all') {
    const r = getDateRange(range);
    if (r) {
      clauses.push(`o.application_date BETWEEN $${idx++} AND $${idx++}`);
      params.push(r.start, r.end);
    }
  } else if (start_date && end_date) {
    clauses.push(`o.application_date BETWEEN $${idx++} AND $${idx++}`);
    params.push(start_date, end_date);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT
      o.user_id,
      u.name AS user_name,
      o.hierarchy_level,
      o.application_date,
      'application_life' AS table_type,
      o.carrier_name, o.product_name, o.policy_number,
      o.insured_name,
      o.application_status,
      o.face_amount,
      o.initial_premium,
      o.target_premium,
      NULL::numeric AS flex_premium,
      o.product_rate,
      o.split_percent, o.split_with_id,
      o.mra_status
    FROM application_life o
    JOIN users u ON u.id = o.user_id
    ${where}

    UNION ALL

    SELECT
      o.user_id,
      u.name AS user_name,
      o.hierarchy_level,
      o.application_date,
      'application_annuity' AS table_type,
      o.carrier_name, o.product_name, o.policy_number,
      o.insured_name,
      o.application_status,
      NULL::numeric AS face_amount,
      o.initial_premium,
      NULL::numeric AS target_premium,
      o.flex_premium,
      o.product_rate,
      o.split_percent, o.split_with_id,
      o.mra_status
    FROM application_annuity o
    JOIN users u ON u.id = o.user_id
    ${where}

    ORDER BY application_date DESC
  `;

  try {
    const { rows } = await pool.query(sql, [...params, ...params]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Applications');
    ws.columns = [
      { header: 'User ID', key: 'user_id', width: 10 },
      { header: 'Writing Agent', key: 'user_name', width: 24 },
      { header: 'Level', key: 'hierarchy_level', width: 16 },
      { header: 'Application Date', key: 'application_date', width: 18 },
      { header: 'Product Type', key: 'table_type', width: 18 },
      { header: 'Carrier', key: 'carrier_name', width: 20 },
      { header: 'Product Name', key: 'product_name', width: 28 },
      { header: 'Policy Number', key: 'policy_number', width: 18 },
      { header: 'Insured Name', key: 'insured_name', width: 22 },
      { header: 'Status', key: 'application_status', width: 16 },
      { header: 'Face Amount', key: 'face_amount', width: 16 },
      { header: 'Planned Premium', key: 'initial_premium', width: 18 },
      { header: 'Target Premium', key: 'target_premium', width: 16 },
      { header: 'Base Premium (Flex)', key: 'flex_premium', width: 18 },
      { header: 'Product Rate (%)', key: 'product_rate', width: 16 },
      { header: 'Split % (other)', key: 'split_percent', width: 14 },
      { header: 'Split With ID', key: 'split_with_id', width: 14 },
      { header: 'Notes', key: 'mra_status', width: 18 },
    ];
    rows.forEach((r) => ws.addRow(r));

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="applications_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('Export application.xlsx error', e);
    res.status(500).json({ error: 'Failed to build export' });
  }
});

module.exports = router;
