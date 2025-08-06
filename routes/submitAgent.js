const express = require('express')
const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const nodemailer = require('nodemailer')

const router = express.Router()

router.post('/submit-agent-data', async (req, res) => {
  try {
    const data = req.body
    const pdfPath = path.join(__dirname, '../tmp/agent_form.pdf')

    await generatePDF(data, pdfPath)
    await sendEmailWithAttachment(pdfPath)

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})

function generatePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 })
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    doc.fontSize(18).text('Agent Submission Summary', { underline: true })
    doc.moveDown()

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.startsWith('data:image')) {
        doc.addPage()
        doc.fontSize(16).text(`${key}`, { underline: true })
        const base64Data = value.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        doc.image(buffer, { fit: [400, 200] })
        doc.moveDown()
      } else {
        doc.fontSize(12).text(`${key}: ${value}`)
      }
    }

    doc.end()

    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
}

async function sendEmailWithAttachment(filePath) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  await transporter.sendMail({
    from: `"FISO Submission" <${process.env.EMAIL_USER}>`,
    to: 'nt1538@nyu.edu',
    subject: 'New Agent Submission',
    text: 'Attached is the submitted agent form.',
    attachments: [
      {
        filename: 'agent_form.pdf',
        path: filePath
      }
    ]
  })
}
module.exports = router
