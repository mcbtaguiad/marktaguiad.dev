(() => {
  const STORAGE_KEY = 'theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  const html = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');

  // --------------------------
  // Apply theme to page + icon + Giscus
  // --------------------------
  function applyTheme(theme) {
    const isDark = theme === DARK;

    html.classList.toggle('theme-dark', isDark);
    html.classList.toggle('theme-light', !isDark);

    localStorage.setItem(STORAGE_KEY, theme);
    updateIcon(isDark);
    setGiscusTheme(isDark ? 'dark' : 'light');
  }

  // --------------------------
  // Update FA moon icon
  // --------------------------
  function updateIcon(isDark) {
    if (!icon) return;

    icon.classList.remove('fa-solid', 'fa-regular', 'fa-moon');

    if (isDark) {
      icon.classList.add('fa-solid', 'fa-moon'); // dark mode = solid moon
    } else {
      icon.classList.add('fa-regular', 'fa-moon'); // light mode = outline moon
    }
  }

  // --------------------------
  // Update Giscus theme
  // --------------------------
  function setGiscusTheme(theme, attempts = 0) {
    const iframe = document.querySelector('iframe.giscus-frame');

    if (!iframe && attempts < 20) {
      // retry until iframe exists (max 2s)
      setTimeout(() => setGiscusTheme(theme, attempts + 1), 100);
      return;
    }

    if (!iframe) return; // give up if not found

    iframe.contentWindow.postMessage(
      {
        giscus: { setConfig: { theme } }
      },
      'https://giscus.app'
    );
  }

  // --------------------------
  // Toggle between light/dark
  // --------------------------
  function toggleTheme() {
    const current = localStorage.getItem(STORAGE_KEY) || LIGHT;
    applyTheme(current === DARK ? LIGHT : DARK);
  }

  // --------------------------
  // Initial load
  // --------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(STORAGE_KEY) || LIGHT;
    applyTheme(saved);
  });

  // --------------------------
  // Toggle button click
  // --------------------------
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // prevent parent link navigation
      toggleTheme();
    });
  }
})();
