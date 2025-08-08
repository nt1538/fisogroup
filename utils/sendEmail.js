// utils/sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER || 'admin@fisogroup.com',
    pass: process.env.EMAIL_PASS || 'Joyce2024!'
  }
});

/**
 * Send an email via Office365 SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {Array}  [options.attachments] - Nodemailer attachment objects
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  return transporter.sendMail({
    from: `"FISO Group" <${process.env.EMAIL_USER || 'admin@fisogroup.com'}>`,
    to,
    subject,
    html,
    attachments // <-- now passed along
  });
}

module.exports = { sendEmail };
