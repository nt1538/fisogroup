// routes/adminOrdersExport.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const ExcelJS = require('exceljs');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// util: build where clause like your list endpoints
function buildFilters({ user_name, policy_number, range, start_date, end_date }) {
  const where = [];
  const params = [];
  let i = 1;

  if (user_name) {
    where.push(`LOWER(full_name) LIKE LOWER($${i++})`);
    params.push(`%${user_name}%`);
  }
  if (policy_number) {
    where.push(`LOWER(policy_number) LIKE LOWER($${i++})`);
    params.push(`%${policy_number}%`);
  }

  // range OR explicit dates
  if (range && range !== 'all') {
    const now = new Date();
    let start, end;
    if (range === 'ytd') {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else if (range === 'rolling_3') {
      start = new Date(now); start.setMonth(start.getMonth() - 3);
      end = now;
    } else if (range === 'rolling_12') {
      start = new Date(now); start.setMonth(start.getMonth() - 12);
      end = now;
    }
    if (start && end) {
      where.push(`application_date BETWEEN $${i++} AND $${i++}`);
      params.push(start.toISOString(), end.toISOString());
    }
  } else if (start_date && end_date) {
    where.push(`application_date BETWEEN $${i++} AND $${i++}`);
    params.push(start_date, end_date);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, params };
}

// shape columns per table
function getColumns(kind) {
  if (kind === 'commission') {
    return [
      { header: 'User ID', key: 'user_id', width: 10 },
      { header: 'Payee Name', key: 'full_name', width: 22 },
      { header: 'Level', key: 'hierarchy_level', width: 14 },
      { header: 'Commission Date', key: 'commission_distribution_date', width: 16 },
      { header: 'Carrier', key: 'carrier_name', width: 18 },
      { header: 'Product', key: 'product_name', width: 24 },
      { header: 'Policy #', key: 'policy_number', width: 16 },
      { header: 'Insured', key: 'insured_name', width: 18 },
      { header: 'Writing Agent', key: 'writing_agent', width: 18 },
      { header: 'Face Amount', key: 'face_amount', width: 14 },
      { header: 'Initial Premium', key: 'initial_premium', width: 16 },
      { header: 'Target/Base Premium', key: 'base_premium', width: 18 },
      { header: 'Product Rate %', key: 'product_rate', width: 14 },
      { header: 'Split %', key: 'split_percent', width: 10 },
      { header: 'Split ID', key: 'split_with_id', width: 12 },
      { header: 'Commission %', key: 'commission_percent', width: 14 },
      { header: 'Commission $', key: 'commission_amount', width: 14 },
      { header: 'Type', key: 'order_type', width: 14 },
      { header: 'Notes', key: 'mra_status', width: 16 },
      { header: 'Explanation', key: 'explanation', width: 30 },
      { header: 'Policy Effective', key: 'policy_effective_date', width: 16 },
    ];
  }
  // application
  return [
    { header: 'User ID', key: 'user_id', width: 10 },
    { header: 'Writing Agent', key: 'full_name', width: 22 },
    { header: 'Level', key: 'hierarchy_level', width: 14 },
    { header: 'Application Date', key: 'application_date', width: 16 },
    { header: 'Carrier', key: 'carrier_name', width: 18 },
    { header: 'Product', key: 'product_name', width: 24 },
    { header: 'Policy #', key: 'policy_number', width: 16 },
    { header: 'Insured', key: 'insured_name', width: 18 },
    { header: 'Status', key: 'application_status', width: 14 },
    { header: 'Face Amount', key: 'face_amount', width: 14 },
    { header: 'Initial Premium', key: 'initial_premium', width: 16 },
    { header: 'Target/Base Premium', key: 'base_premium', width: 18 },
    { header: 'Product Rate %', key: 'product_rate', width: 14 },
    { header: 'Split %', key: 'split_percent', width: 10 },
    { header: 'Split ID', key: 'split_with_id', width: 12 },
    { header: 'Notes', key: 'mra_status', width: 16 },
  ];
}

// helpers to fetch rows (same filters as list)
async function fetchCommissionRows(req) {
  const { user_name, policy_number, start_date, end_date, range } = req.query;

  const params = [];
  let i = 1;
  const filters = [];

  if (user_name) {
    filters.push(`LOWER(full_name) LIKE LOWER($${i++})`);
    params.push(`%${user_name}%`);
  }
  if (policy_number) {
    filters.push(`policy_number ILIKE $${i++}`);
    params.push(`%${policy_number}%`);
  }

  // Use commission_distribution_date for commission export ranges
  if (start_date && end_date) {
    filters.push(`commission_distribution_date::date BETWEEN $${i++} AND $${i++}`);
    params.push(start_date, end_date);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  // IMPORTANT: every column's type matches across both SELECTs
  const sql = `
    SELECT * FROM (
      SELECT
        'commission_life'::text                      AS table_type,
        id::int                                      AS id,
        user_id::VARCHAR                             AS user_id,
        full_name::text                              AS user_name,
        hierarchy_level::text                        AS hierarchy_level,
        commission_distribution_date::date           AS commission_distribution_date,
        carrier_name::text                           AS carrier_name,
        product_name::text                           AS product_name,
        policy_number::text                          AS policy_number,
        insured_name::text                           AS insured_name,
        writing_agent::text                          AS writing_agent,
        face_amount::numeric                         AS face_amount,
        initial_premium::numeric                     AS initial_premium,
        target_premium::numeric                      AS base_premium,
        commission_from_carrier::numeric             AS commission_from_carrier,
        product_rate::numeric                        AS product_rate,
        split_percent::numeric                       AS split_percent,
        split_with_id::VARCHAR                       AS split_with_id,
        commission_percent::numeric                  AS commission_percent,
        commission_amount::numeric                   AS commission_amount,
        order_type::text                             AS order_type,
        mra_status::text                             AS mra_status,
        explanation::text                            AS explanation,
        policy_effective_date::date                  AS policy_effective_date
      FROM commission_life

      UNION ALL

      SELECT
        'commission_annuity'::text                   AS table_type,
        id::int                                      AS id,
        user_id::VARCHAR                             AS user_id,
        full_name::text                              AS user_name,
        hierarchy_level::text                        AS hierarchy_level,
        commission_distribution_date::date           AS commission_distribution_date,
        carrier_name::text                           AS carrier_name,
        product_name::text                           AS product_name,
        policy_number::text                          AS policy_number,
        insured_name::text                           AS insured_name,
        writing_agent::text                          AS writing_agent,
        NULL::numeric                                AS face_amount,          -- annuity has no face
        initial_premium::numeric                     AS initial_premium,
        flex_premium::numeric                        AS base_premium,         -- unify name
        commission_from_carrier::numeric             AS commission_from_carrier,
        product_rate::numeric                        AS product_rate,
        split_percent::numeric                       AS split_percent,
        split_with_id::VARCHAR                       AS split_with_id,
        commission_percent::numeric                  AS commission_percent,
        commission_amount::numeric                   AS commission_amount,
        order_type::text                             AS order_type,
        mra_status::text                             AS mra_status,
        explanation::text                            AS explanation,
        policy_effective_date::date                  AS policy_effective_date
      FROM commission_annuity
    ) u
    ${where}
    ORDER BY commission_distribution_date DESC, id DESC
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function fetchApplicationRows(client, userId, query) {
  const { whereSql, params } = buildFilters(query);
  const sql = `
    SELECT *, 'application_life' AS table_type FROM application_life WHERE user_id = $1
    UNION ALL
    SELECT *, 'application_annuity' AS table_type FROM application_annuity WHERE user_id = $1
  `;
  const filtered = `
    SELECT * FROM (${sql}) t
    ${whereSql.replaceAll('application_date', 't.application_date')}
    ORDER BY t.application_date DESC
  `;
  const { rows } = await client.query(filtered, [userId, ...params]);
  return rows;
}

function massageRowForExcel(kind, r) {
  const isAnnuity = (r.table_type || '').includes('annuity');
  const base_premium = isAnnuity ? r.flex_premium : r.target_premium;
  const common = {
    ...r,
    base_premium,
    product_rate: Number(r.product_rate ?? (isAnnuity ? 6 : 100)),
  };
  if (kind === 'commission') {
    // optionally drop commission_from_carrier here if you don’t want it exported
    delete common.commission_from_carrier;
  }
  return common;
}

async function sendWorkbook(res, kind, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  ws.columns = getColumns(kind);

  rows.forEach(r => ws.addRow(r));

  // set headers
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  const filename = `${kind}_export_${ts}.xlsx`;
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

// === ROUTES ===
router.get('/orders/commission/export', verifyToken, verifyAdmin, async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    const rows = await fetchCommissionRows(client, userId, req.query);
    const prepared = rows.map(r => massageRowForExcel('commission', r));
    await sendWorkbook(res, 'commission', prepared);
  } catch (e) {
    console.error('Export commission failed:', e);
    res.status(500).json({ error: 'Export failed' });
  } finally {
    client.release();
  }
});

router.get('/orders/application/export', verifyToken, verifyAdmin, async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    const rows = await fetchApplicationRows(client, userId, req.query);
    const prepared = rows.map(r => massageRowForExcel('application', r));
    await sendWorkbook(res, 'application', prepared);
  } catch (e) {
    console.error('Export application failed:', e);
    res.status(500).json({ error: 'Export failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
