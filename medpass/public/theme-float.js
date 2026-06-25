'use strict';
(function () {
  var THEMES = [
    { key: '',         label: 'Dark',     icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
    { key: 'clinical', label: 'Clinical', icon: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' },
    { key: 'dark-neon', label: 'Neon',   icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
    { key: 'ambient',  label: 'Ambient',  icon: '<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>' }
  ];
  var btn = document.getElementById('themeFloatBtn');
  var iconEl = document.getElementById('themeFloatIcon');
  var labelEl = document.getElementById('themeFloatLabel');
  if (!btn) return;

  function curTheme() { return localStorage.getItem('medpass-theme') || ''; }

  function apply(t) {
    if (!t.key) { document.documentElement.removeAttribute('data-theme'); }
    else { document.documentElement.setAttribute('data-theme', t.key); }
    localStorage.setItem('medpass-theme', t.key);
    iconEl.innerHTML = t.icon;
    labelEl.textContent = t.label;
    btn.dataset.theme = t.key;
    document.querySelectorAll('.theme-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.theme === t.key);
    });
  }

  btn.addEventListener('click', function () {
    var cur = curTheme();
    var idx = THEMES.findIndex(function(t){ return t.key === cur; });
    apply(THEMES[(idx + 1) % THEMES.length]);
  });

  var init = THEMES.find(function(t){ return t.key === curTheme(); }) || THEMES[0];
  apply(init);
})();
