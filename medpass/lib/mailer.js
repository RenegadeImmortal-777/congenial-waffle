'use strict';
const tls = require('node:tls');
const os  = require('node:os');

const b64 = s => Buffer.from(String(s), 'utf8').toString('base64');

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function smtpSend({ to, subject, text }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 465;
  const from = process.env.SMTP_FROM || user;

  return new Promise((resolve, reject) => {
    let buf  = '';
    let step = 0;
    let done = false;

    const finish = (err, val) => {
      if (done) return;
      done = true;
      clearTimeout(tmr);
      try { sock.destroy(); } catch {}
      err ? reject(err) : resolve(val);
    };

    const tmr = setTimeout(() => finish(new Error('SMTP timeout')), 25000);

    const sock = tls.connect({ host, port, rejectUnauthorized: false }, () => {});
    sock.setEncoding('utf8');
    sock.on('error', err => finish(err));

    const write = line => { if (!done) sock.write(line + '\r\n'); };

    sock.on('data', chunk => {
      buf += chunk;
      let cr;
      while ((cr = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, cr);
        buf = buf.slice(cr + 2);

        if (/^\d{3}-/.test(line)) continue;

        const code = parseInt(line.slice(0, 3), 10);
        step++;

        try {
          switch (step) {
            case 1:
              if (code !== 220) throw new Error(`Bad greeting: ${line}`);
              write(`EHLO ${os.hostname().replace(/[^a-zA-Z0-9.-]/g, 'x').slice(0, 60) || 'medpass'}`);
              break;
            case 2:
              if (code !== 250) throw new Error(`EHLO failed: ${line}`);
              write('AUTH LOGIN');
              break;
            case 3:
              if (code !== 334) throw new Error(`AUTH LOGIN failed: ${line}`);
              write(b64(user));
              break;
            case 4:
              if (code !== 334) throw new Error(`Username rejected: ${line}`);
              write(b64(pass));
              break;
            case 5:
              if (code !== 235) throw new Error(`Auth failed — check SMTP credentials: ${line}`);
              write(`MAIL FROM:<${from}>`);
              break;
            case 6:
              if (code !== 250) throw new Error(`MAIL FROM rejected: ${line}`);
              write(`RCPT TO:<${to}>`);
              break;
            case 7:
              if (code !== 250) throw new Error(`RCPT TO rejected: ${line}`);
              write('DATA');
              break;
            case 8: {
              if (code !== 354) throw new Error(`DATA not accepted: ${line}`);
              const safeSubj = String(subject || '').replace(/[\r\n]/g, ' ');
              const body = [
                `Date: ${new Date().toUTCString()}`,
                `From: MedPass <${from}>`,
                `To: ${to}`,
                `Subject: ${safeSubj}`,
                `MIME-Version: 1.0`,
                `Content-Type: text/plain; charset=UTF-8`,
                '',
                String(text || ''),
                '.',
              ].join('\r\n');
              sock.write(body + '\r\n');
              break;
            }
            case 9:
              if (code !== 250) throw new Error(`Message rejected: ${line}`);
              write('QUIT');
              break;
            case 10:
              finish(null, { delivered: true });
              break;
            default:
              break;
          }
        } catch (err) {
          finish(err);
        }
      }
    });
  });
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
  try {
    const result = await smtpSend({ to, subject, text });
    console.log(`[mailer] delivered to ${to}`);
    return result;
  } catch (err) {
    console.error(`[mailer] SMTP error: ${err.message}`);
    throw err;
  }
}

function verificationEmail({ to, link }) {
  return sendMail({
    to,
    subject: 'Verify your MedPass account',
    text: `Welcome to MedPass.\n\nVerify your email:\n${link}\n\nExpires in 24 hours.`,
  });
}

function passwordResetEmail({ to, link }) {
  return sendMail({
    to,
    subject: 'Reset your MedPass password',
    text: `Reset your MedPass password:\n${link}\n\nExpires in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`,
  });
}

module.exports = { sendMail, verificationEmail, passwordResetEmail, isConfigured };
