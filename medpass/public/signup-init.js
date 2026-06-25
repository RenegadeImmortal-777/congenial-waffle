'use strict';
initBgCanvas();
Vitals.init('vitalsCanvas', 'vitalsStatus');

const banner = document.getElementById('banner');
const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitBtn');
const pwInput = document.getElementById('password');
const meterBars = document.querySelectorAll('#strengthMeter i');
const strengthLabel = document.getElementById('strengthLabel');
const devLinkBox = document.getElementById('devLinkBox');
const devLinkAnchor = document.getElementById('devLinkAnchor');

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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner(banner);
  devLinkBox.classList.remove('show');
  Vitals.setState('sending');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const data = await postJSON('/api/auth/signup', {
      email: document.getElementById('email').value.trim(),
      password: pwInput.value,
    });
    Vitals.setState('success');
    showBanner(banner, 'success', 'Account created. Taking you in…');
    submitBtn.textContent = 'Account created';
    setTimeout(() => { window.location.href = '/app.html'; }, 800);
  } catch (err) {
    Vitals.setState('error');
    showBanner(banner, 'error', err.message || 'Could not create account.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
    setTimeout(() => Vitals.setState('idle'), 1800);
  }
});
