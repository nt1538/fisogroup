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
      to: 'contracting@fisogroup.com',
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
  'EFTSignature'
]);

// Same list as your frontend, in order:
const YESNO_QUESTIONS = [
  'Have you ever been charged or convicted of or plead guilty or no contest to any Felony, Misdemeanor, federal/state insurance and/or securities or investments regulations and statutes? Have you ever been on probation?',
  'Have you ever been or are you currently being investigated, have any pending indictments, lawsuits, or have you ever been in lawsuit with insurance company?',
  'Have you ever been alleged to have engaged in any fraud?',
  'Have you ever been found to have engaged in any fraud?',
  'Has any insurance or financial services company, or broker-dealer terminated your contract or appointment or permitted you to resign for reason other than lack of sales?',
  'Have you ever had an appointment with any insurance company terminated for cause or been denied an appointment?',
  'Does any insurer, insured, or other person claim any commission chargeback or other indebtedness from you as a result of any insurance transactions or business?',
  'Has any lawsuit or claim ever been made against your surety company, or errors and omissions insurer, arising out of your sales or practices, or, have you been refused surety bonding or E&O coverage?',
  'Have you ever had an insurance or securities license denied, suspended, cancelled or revoked?',
  'Has any state or federal regulatory body found you to have been a cause of an investment OR insurance-related business having its authorization to do business denied, suspended, revoked, or restricted?',
  'Has any state or federal regulatory agency revoked or suspended your license as an attorney, accountant, or federal contractor?',
  'Has any state or federal regulatory agency found you to have made a false statement or omission or been dishonest, unfair, or unethical?',
  'Have you ever had any interruptions in licensing?',
  'Has any state, federal or self-regulatory agency filed a complaint against you, fined, sanctioned, censured, penalized or otherwise disciplined you for a violation of their regulations or state or federal statutes? Have you ever been the subject of a consumer initiated complaint?',
  'Have you personally or any insurance or securities brokerage firm with whom you have been associated filed a bankruptcy petition or declared bankruptcy?',
  'Have you ever had any judgments, garnishments, or liens against you?',
  'Are you connected in any way with a bank, savings & loan association, or other lending or financial institution?',
  'Have you ever used any other names or aliases?',
  'Do you have any unresolved matters pending with the Internal Revenue Service or other taxing authority?'
];

function isLikelyImageBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;    // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true; // PNG
  return false;
}

function toImageBufferIfValid(key, val) {
  if (typeof val !== 'string') return null;
  if (!KNOWN_IMAGE_KEYS.has(key) && !val.startsWith('data:image')) return null;

  const base64 = val.startsWith('data:image') ? (val.split(',')[1] || '') : val;
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) return null;
  try {
    const buf = Buffer.from(base64, 'base64');
    return isLikelyImageBuffer(buf) ? buf : null;
  } catch { return null; }
}

function prettyValue(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

function renderKeyValues(doc, obj) {
  // simple key: value list, truncating very long values
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  Object.entries(obj).forEach(([k, v]) => {
    if (KNOWN_IMAGE_KEYS.has(k)) return; // skip images here
    const valStr = prettyValue(v);
    const safe = valStr.length > 3000 ? valStr.slice(0, 3000) + '…(truncated)' : valStr;
    doc.text(`${k}: ${safe}`, { width });
    doc.moveDown(0.2);
  });
}

function renderImages(doc, obj) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const maxImgWidth = Math.min(500, pageWidth);
  const maxImgHeight = 250;

  Object.entries(obj).forEach(([k, v]) => {
    const buf = toImageBufferIfValid(k, v);
    if (!buf) return;

    // add space/page if needed
    const need = maxImgHeight + 60;
    if (doc.y + need > doc.page.height - doc.page.margins.bottom) doc.addPage();

    doc.moveDown(0.6);
    doc.fontSize(14).text(k, { underline: true });
    doc.moveDown(0.3);
    doc.image(buf, { fit: [maxImgWidth, maxImgHeight], align: 'left' });
    doc.moveDown(0.3);
  });
}

function renderYesNoPage(doc, answers) {
  // answers is an array of "Yes"/"No"/""
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(14).text('Legal Questions — Answers', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);

  YESNO_QUESTIONS.forEach((q, i) => {
    const a = answers?.[i] || '';
    doc.text(`${i + 1}. ${q}`, { width });
    doc.text(`Answer: ${a || '(blank)'}`);
    doc.moveDown(0.4);
  });

  // Problems section = all "Yes"
  const problems = YESNO_QUESTIONS
    .map((q, i) => ({ i, q, a: answers?.[i] || '' }))
    .filter(x => x.a.toLowerCase() === 'yes');

  doc.moveDown(0.5);
  doc.fontSize(14).text('Yes Responses (Problems)', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(12);

  if (problems.length === 0) {
    doc.text('None');
  } else {
    problems.forEach(p => {
      doc.text(`${p.i + 1}. ${p.q}`);
      doc.moveDown(0.3);
    });
  }
}

function generatePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.font('Helvetica');
    doc.fontSize(18).text('Agent Submission', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(0.5);

    const pages = (data && data.pages) || {};
    const pageKeys = Array.from({ length: 10 }, (_, i) => `page${i + 1}`).filter(k => pages[k]);

    if (pageKeys.length === 0) {
      // fallback: render the raw object on one page
      doc.moveDown(0.5);
      renderKeyValues(doc, data);
      renderImages(doc, data);
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
      return;
    }

    pageKeys.forEach((key, idx) => {
      const pageData = pages[key];
      if (idx > 0) doc.addPage();

      doc.fontSize(16).text(`Form Page ${idx + 1}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);

      // Special handling for page 4 (your Yes/No block): it’s stored as an array
      if (key === 'page4' && Array.isArray(pageData)) {
        renderYesNoPage(doc, pageData);
      } else if (Array.isArray(pageData)) {
        // unknown array: list items
        pageData.forEach((item, i) => doc.text(`${i + 1}. ${prettyValue(item)}`));
      } else if (pageData && typeof pageData === 'object') {
        renderKeyValues(doc, pageData);
        renderImages(doc, pageData);
      } else {
        doc.text(prettyValue(pageData));
      }
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = router;
