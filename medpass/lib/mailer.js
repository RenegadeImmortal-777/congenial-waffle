'use strict';

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendMail({ to, subject, text }) {
  if (!isConfigured()) {
    console.log('\n── [DEV MAILER] ──────────────────────────');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('──────────────────────────────────────────\n');
    return { delivered: false, dev: true };
  }
  throw new Error('SMTP configured but no transport implemented. Wire up nodemailer in lib/mailer.js.');
}

function verificationEmail({ to, link }) {
  return sendMail({
    to, subject: 'Verify your MedPass account',
    text: `Welcome to MedPass.\n\nVerify your email:\n${link}\n\nExpires in 24 hours.`,
  });
}

function passwordResetEmail({ to, link }) {
  return sendMail({
    to, subject: 'Reset your MedPass password',
    text: `Reset your MedPass password:\n${link}\n\nExpires in 1 hour.`,
  });
}

module.exports = { sendMail, verificationEmail, passwordResetEmail, isConfigured };
