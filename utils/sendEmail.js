// utils/sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: 'admin@fisogroup.com',
    pass: 'Joyce2024!'
  }
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: '"FISO Group" <admin@fisogroup.com>',
    to,
    subject,
    html,
    attachments
  });
}

module.exports = { sendEmail };
