// routes/agent.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { sendEmail } = require('../utils/sendEmail');

const router = express.Router();

router.post('/submit-agent-data', async (req, res) => {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const pdfPath = path.join(tmpDir, `agent_form_${Date.now()}.pdf`);
    await generatePDF(data, pdfPath);

    const stat = fs.statSync(pdfPath);
    console.log(`[pdf] wrote ${pdfPath} (${stat.size} bytes)`);
    if (stat.size === 0) throw new Error('PDF generated but size is 0 bytes');

    const pdfBuffer = fs.readFileSync(pdfPath);

    await sendEmail({
      to: 'nt1538@nyu.edu',
      subject: 'New Agent Submission — Full Payload (PDF attached)',
      html: '<p>Attached is the submitted agent form PDF.</p>',
      attachments: [{ filename: 'agent_form.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
    });

    try { fs.unlinkSync(pdfPath); } catch (_) {}

    res.json({ success: true });
  } catch (err) {
    console.error('submit-agent-data error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------- PDF helpers ---------- */

// Only these keys are allowed to be treated as images by name:
const KNOWN_IMAGE_KEYS = new Set([
  'Signature',
  'AuthorizationSignature',
  'NonSolicitationSignature',
  'agentDrawnSignature'
]);

function isLikelyImageBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  return false;
}

function toImageBufferIfValid(key, val) {
  if (typeof val !== 'string') return null;

  // Only attempt decode if key is known *or* the string is clearly long enough to be an image
  const looksLongEnough = val.length > 1000;

  // Handle data URL
  if (val.startsWith('data:image')) {
    const base64 = val.split(',')[1];
    if (!base64) return null;
    try {
      const buf = Buffer.from(base64, 'base64');
      return isLikelyImageBuffer(buf) ? buf : null;
    } catch { return null; }
  }

  // Base64-only path (we used this on the frontend)
  if (KNOWN_IMAGE_KEYS.has(key) || looksLongEnough) {
    // reject obviously non-base64 strings
    if (!/^[A-Za-z0-9+/=]+$/.test(val)) return null;
    try {
      const buf = Buffer.from(val, 'base64');
      return isLikelyImageBuffer(buf) ? buf : null;
    } catch { return null; }
  }

  return null;
}

function prettyValue(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

function generatePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(outputPath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    doc.pipe(stream);
    doc.font('Helvetica');

    // Title
    doc.fontSize(18).text('Agent Submission Summary', { underline: true });
    doc.moveDown();

    // 1) Render non-image fields as key: value
    doc.fontSize(12);
    Object.entries(data).forEach(([key, value]) => {
      const buf = toImageBufferIfValid(key, value);
      if (!buf) {
        // Avoid dumping gigantic strings (e.g., base64 that slipped through)
        const valStr = prettyValue(value);
        const safeVal = valStr.length > 3000 ? valStr.slice(0, 3000) + '…(truncated)' : valStr;
        doc.text(`${key}: ${safeVal}`, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
        doc.moveDown(0.2);
      }
    });

    // 2) Render images (signatures) afterward, only when valid
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const maxImgWidth = Math.min(500, pageWidth);
    const maxImgHeight = 250;

    Object.entries(data).forEach(([key, value]) => {
      const buf = toImageBufferIfValid(key, value);
      if (!buf) return;

      try {
        // Make sure there's room on the current page; otherwise add a page
        const y = doc.y;
        if (y + maxImgHeight + 60 > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }

        doc.moveDown(0.8);
        doc.fontSize(16).text(`${key}`, { underline: true });
        doc.moveDown(0.3);

        // Let pdfkit scale with fit; no addPage until we know buf is valid
        doc.image(buf, {
          fit: [maxImgWidth, maxImgHeight],
          align: 'left'
        });
        doc.moveDown(0.5);
      } catch (e) {
        // If image fails, log and render a warning line instead of adding pages
        console.warn(`[pdf] failed to render image for key "${key}":`, e.message);
        doc.fontSize(12).fillColor('red').text(`⚠ Failed to render image for ${key}`);
        doc.fillColor('black');
      }
    });

    doc.end();
  });
}

module.exports = router;
