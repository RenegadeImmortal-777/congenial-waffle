'use strict';
initBgCanvas();
Vitals.init('vitalsCanvas', 'vitalsStatus');
const banner = document.getElementById('banner');
const form = document.getElementById('forgotForm');
const submitBtn = document.getElementById('submitBtn');
const devLinkBox = document.getElementById('devLinkBox');
const devLinkAnchor = document.getElementById('devLinkAnchor');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner(banner);
  devLinkBox.classList.remove('show');
  Vitals.setState('sending');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  try {
    const data = await postJSON('/api/auth/forgot-password', {
      email: document.getElementById('email').value.trim(),
    });
    Vitals.setState('success');
    showBanner(banner, 'success', data.message);
    if (data.devResetLink) {
      devLinkAnchor.href = data.devResetLink;
      devLinkAnchor.textContent = data.devResetLink;
      devLinkBox.classList.add('show');
    }
    submitBtn.textContent = 'Link sent';
  } catch (err) {
    Vitals.setState('error');
    showBanner(banner, 'error', err.message || 'Something went wrong.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send reset link';
    setTimeout(() => Vitals.setState('idle'), 1800);
  }
});
