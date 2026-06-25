'use strict';
initBgCanvas();
Vitals.init('vitalsCanvas', 'vitalsStatus');

const banner = document.getElementById('banner');
const formWrap = document.getElementById('formWrap');
const form = document.getElementById('resetForm');
const submitBtn = document.getElementById('submitBtn');
const pwInput = document.getElementById('password');
const meterBars = document.querySelectorAll('#strengthMeter i');
const strengthLabel = document.getElementById('strengthLabel');
const token = getQueryParam('token');

document.getElementById('toggleBtn').addEventListener('click', (e) => {
  togglePassword('password', e.currentTarget);
});

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'];
const STRENGTH_CLASS = ['', 'on-weak', 'on-weak', 'on-ok', 'on-strong'];

pwInput.addEventListener('input', () => {
  const score = passwordStrength(pwInput.value);
  meterBars.forEach((bar, i) => {
    bar.className = i < score ? STRENGTH_CLASS[score] : '';
  });
  strengthLabel.textContent = pwInput.value ? STRENGTH_LABELS[score] : '\u00A0';
});

if (!token) {
  formWrap.style.display = 'none';
  showBanner(banner, 'error', 'This link is missing a reset token. Request a new one below.');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner(banner);
  Vitals.setState('sending');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating…';

  try {
    const data = await postJSON('/api/auth/reset-password', {
      token,
      password: pwInput.value,
    });
    Vitals.setState('success');
    showBanner(banner, 'success', data.message || 'Password updated. You can now sign in.');
    form.reset();
    meterBars.forEach((bar) => (bar.className = ''));
    strengthLabel.textContent = '\u00A0';
    submitBtn.textContent = 'Password updated';
    setTimeout(() => { window.location.href = '/login.html'; }, 1400);
  } catch (err) {
    Vitals.setState('error');
    showBanner(banner, 'error', err.message || 'Could not update password.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update password';
    setTimeout(() => Vitals.setState('idle'), 1800);
  }
});
