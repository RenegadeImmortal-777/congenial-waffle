'use strict';
// No SMTP library is wired up here (this sandbox can't reach the npm
// registry to install nodemailer). In development, "sending" an email
// means: log it to the console, and let routes/auth.js echo the link
// back in the JSON response (devVerifyLink / devResetLink) so the
// frontend can show it directly — handy for testing without an inbox.
//
// To go live: install nodemailer (`npm install nodemailer`) wherever
// you actually deploy this (this sandbox can't reach the registry, but
// a normal dev machine or CI can), fill in SMTP_HOST/PORT/USER/PASS in
// .env, and replace the body of sendMail() below with a real
// transporter.sendMail(...) call. Everything that calls sendMail()
// elsewhere in the app stays the same.
function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.log('\n──────── [DEV MAILER — no SMTP configured] ────────');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('─────────────────────────────────────────────────\n');
    return { delivered: false, dev: true };
  }
  // Placeholder for a real transport. Left unimplemented on purpose —
  // wire up nodemailer (or fetch a transactional-email API like
  // Postmark/Resend/SES) here once SMTP_* env vars are set.
  throw new Error(
    'SMTP is configured but no real mail transport is implemented yet. ' +
    'Install nodemailer and replace lib/mailer.js sendMail().'
  );
}
function verificationEmail({ to, link }) {
  return sendMail({
    to,
    subject: 'Verify your MedPass account',
    text: `Welcome to MedPass.\n\nVerify your email address to activate your account:\n${link}\n\nThis link expires in 24 hours. If you didn't create this account, ignore this email.`,
  });
}
function passwordResetEmail({ to, link }) {
  return sendMail({
    to,
    subject: 'Reset your MedPass password',
    text: `We received a request to reset your MedPass password.\n\nReset it here:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email — your password will stay the same.`,
  });
}
module.exports = { sendMail, verificationEmail, passwordResetEmail, isConfigured };
