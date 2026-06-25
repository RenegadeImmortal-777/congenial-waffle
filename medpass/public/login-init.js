'use strict';
initBgCanvas();
Vitals.init('vitalsCanvas', 'vitalsStatus');
const banner = document.getElementById('banner');
const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
document.getElementById('toggleBtn').addEventListener('click', (e) => {
  togglePassword('password', e.currentTarget);
});
// Surface state passed via query params from server redirects.
(function showEntryNotice() {
  const verified = getQueryParam('verified');
  const verifyError = getQueryParam('verify_error');
  if (verified === '1') {
    showBanner(banner, 'success', 'Email verified — you can sign in now.');
  } else if (verifyError) {
    showBanner(banner, 'error', verifyError);
  }
})();
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner(banner);
  Vitals.setState('sending');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';
  try {
    const data = await postJSON('/api/auth/login', {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    });
    Vitals.setState('success');
    showBanner(banner, 'success', 'Signed in. Redirecting…');
    window.location.href = '/app.html';
  } catch (err) {
    Vitals.setState('error');
    showBanner(banner, 'error', err.message || 'Sign in failed.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
    setTimeout(() => Vitals.setState('idle'), 1800);
  }
});
