// routes/agent.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const router = express.Router();

router.post('/submit-agent-data', async (req, res) => {
  try {
    // Ensure body is an object (not a raw string)
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const pdfPath = path.join(tmpDir, `agent_form_${Date.now()}.pdf`);

    await generatePDF(data, pdfPath);
    await sendEmailWithAttachment(pdfPath);

    // cleanup
    try { fs.unlinkSync(pdfPath); } catch (_) {}

    res.json({ success: true });
  } catch (err) {
    console.error('submit-agent-data error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function asBase64(value) {
  // Accept base64-only OR full data URL; return pure base64 string or null
  if (typeof value !== 'string') return null;
  if (value.startsWith('data:image')) {
    return value.split(',')[1] || null;
  }
  // looks like base64-only (no data URL header)
  if (/^[A-Za-z0-9+/=]+$/.test(value)) return value;
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
    doc.pipe(stream);

    doc.fontSize(18).text('Agent Submission Summary', { underline: true });
    doc.moveDown();

    // Text first, images after (keeps layout tidy)
    for (const [key, value] of Object.entries(data)) {
      const b64 = asBase64(value);
      if (!b64) {
        doc.fontSize(12).text(`${key}: ${prettyValue(value)}`, { lineGap: 2 });
      }
    }

    // Add images (signatures) at the end
    for (const [key, value] of Object.entries(data)) {
      const b64 = asBase64(value);
      if (b64) {
        try {
          const buffer = Buffer.from(b64, 'base64');
          doc.addPage();
          doc.fontSize(16).text(`${key}`, { underline: true });
          doc.moveDown(0.5);
          doc.image(buffer, { fit: [500, 250] });
          doc.moveDown();
        } catch (e) {
          doc.addPage();
          doc.fontSize(16).text(`${key}`, { underline: true });
          doc.fontSize(12).fillColor('red').text('⚠ Failed to render image');
          doc.fillColor('black');
        }
      }
    }

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function sendEmailWithAttachment(filePath) {
  // Use Gmail SMTP with an App Password (not your normal password)
  // https://myaccount.google.com/apppasswords
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true, // 465 = true, 587 = false + starttls
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App Password if using Gmail
    },
    pool: true,
  });

  // Optional: verify config once at startup or before send
  // await transporter.verify();

  await transporter.sendMail({
    from: `"FISO Submission" <${process.env.EMAIL_USER}>`,
    to: 'nt1538@nyu.edu',
    subject: 'New Agent Submission — Full Payload (PDF attached)',
    text: 'Attached is the submitted agent form PDF.',
    attachments: [
      { filename: path.basename(filePath), path: filePath }
    ],
  });
}

module.exports = router;
