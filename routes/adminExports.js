// routes/adminOrdersExport.js (or inside your existing admin orders router)
const express = require('express');
const router = express.Router();
const pool = require('../db');
const ExcelJS = require('exceljs');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// small helper – reuse whatever date-range logic you already use
function getDateRange(range) {
  const now = new Date();
  const start = new Date();
  if (range === 'ytd') { start.setMonth(0, 1); start.setHours(0,0,0,0); }
  if (range === 'rolling_3') { start.setMonth(start.getMonth() - 3); }
  if (range === 'rolling_12') { start.setMonth(start.getMonth() - 12); }
  return range && range !== 'all'
    ? { start: start.toISOString(), end: now.toISOString() }
    : null;
}

// Build the same query the page uses
function buildCommissionQuery({ user_name, policy_number, range, start_date, end_date }) {
  let text = `
    SELECT
      c.id,
      c.user_id,
      u.name AS user_name,
      c.hierarchy_level,
      c.commission_distribution_date,
      'commission_' || CASE WHEN c.flex_premium IS NOT NULL THEN 'annuity' ELSE 'life' END AS table_type,
      c.carrier_name,
      c.product_name,
      c.policy_number,
      c.insured_name,
      c.writing_agent,
      c.face_amount,
      c.initial_premium,
      c.target_premium,
      c.flex_premium,
      c.commission_from_carrier,
      c.product_rate,
      c.split_percent,
      c.split_with_id,
      c.commission_percent,
      c.commission_amount,
      c.order_type,
      c.mra_status,
      c.explanation,
      c.policy_effective_date
    FROM (
      SELECT * FROM commission_life
      UNION ALL
      SELECT * FROM commission_annuity
    ) c
    JOIN users u ON u.id = c.user_id
    WHERE 1=1
  `;
  const values = [];
  let i = 1;

  if (user_name) {
    text += ` AND LOWER(u.name) LIKE LOWER($${i++})`;
    values.push(`%${user_name}%`);
  }
  if (policy_number) {
    text += ` AND LOWER(c.policy_number) LIKE LOWER($${i++})`;
    values.push(`%${policy_number}%`);
  }

  if (range && range !== 'all') {
    const dr = getDateRange(range);
    if (dr) {
      text += ` AND c.commission_distribution_date BETWEEN $${i++} AND $${i++}`;
      values.push(dr.start, dr.end);
    }
  } else if (start_date && end_date) {
    text += ` AND c.commission_distribution_date BETWEEN $${i++} AND $${i++}`;
    values.push(start_date, end_date);
  }

  text += ` ORDER BY c.commission_distribution_date DESC`;
  return { text, values };
}

router.get('/admin/orders/commission/export', verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('[EXPORT] hit /admin/orders/commission/export', req.query);

    const { text, values } = buildCommissionQuery({
      user_name: req.query.user_name,
      policy_number: req.query.policy_number,
      range: req.query.range,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    });

    const { rows } = await pool.query(text, values);
    console.log(`[EXPORT] rows returned: ${rows.length}`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Commission');

    ws.columns = [
      { header: 'ID', key: 'user_id', width: 10 },
      { header: 'Payee Name', key: 'user_name', width: 24 },
      { header: 'Level', key: 'hierarchy_level', width: 16 },
      { header: 'Commission Date', key: 'commission_distribution_date', width: 16 },
      { header: 'Type', key: 'table_type', width: 16 },
      { header: 'Carrier', key: 'carrier_name', width: 18 },
      { header: 'Product', key: 'product_name', width: 28 },
      { header: 'Policy #', key: 'policy_number', width: 18 },
      { header: 'Insured', key: 'insured_name', width: 22 },
      { header: 'Writing Agent', key: 'writing_agent', width: 22 },
      { header: 'Face Amount', key: 'face_amount', width: 14 },
      { header: 'Paid Premium', key: 'initial_premium', width: 14 },
      { header: 'Target/Base Premium', key: 'base_premium', width: 18 },
      { header: 'From Carrier', key: 'commission_from_carrier', width: 16 },
      { header: 'Product Rate %', key: 'product_rate', width: 14 },
      { header: 'Split %', key: 'split_display', width: 10 },
      { header: 'Split ID', key: 'split_with_id', width: 12 },
      { header: 'Commission %', key: 'commission_percent', width: 14 },
      { header: 'Commission $', key: 'commission_amount', width: 14 },
      { header: 'Commission Type', key: 'order_type', width: 18 },
      { header: 'Notes', key: 'mra_status', width: 18 },
      { header: 'Explanation', key: 'explanation', width: 40 },
      { header: 'Effective Date', key: 'policy_effective_date', width: 16 },
    ];

    rows.forEach(r => {
      ws.addRow({
        ...r,
        base_premium: r.table_type === 'commission_annuity' ? r.flex_premium : r.target_premium,
        split_display: r.split_percent === 100 ? 100 : 100 - (Number(r.split_percent) || 0),
      });
    });

    // optional: basic header styling
    ws.getRow(1).font = { bold: true };

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="commission_export.xlsx"');

    await wb.xlsx.write(res);
    res.end();
    console.log('[EXPORT] stream finished');
  } catch (err) {
    console.error('[EXPORT] failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'EXPORT_FAILED', detail: err.message });
    }
  }
});

module.exports = router;
