(() => {
  const STORAGE_KEY = 'theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  const html = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');


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
  function setGiscusTheme(theme) {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme } } },
        'https://giscus.app'
      );
    } else {
      // Wait until iframe is added to the DOM
      const observer = new MutationObserver((mutations, obs) => {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (iframe) {
          iframe.contentWindow.postMessage(
            { giscus: { setConfig: { theme } } },
            'https://giscus.app'
          );
          obs.disconnect(); // stop observing
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // --------------------------
  // Apply theme to page + icon + Giscus
  // --------------------------
  function applyTheme(theme) {
    const isDark = theme === DARK;
    html.classList.toggle('theme-dark', isDark);
    html.classList.toggle('theme-light', !isDark);
    localStorage.setItem(STORAGE_KEY, theme);
    updateIcon(isDark);
    setGiscusTheme(isDark ? 'dark' : 'light'); // now safe
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
    // check saved theme or current HTML class
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = saved || (html.classList.contains('theme-dark') ? DARK : LIGHT);
    applyTheme(theme);
  });

  // --------------------------
  // Toggle button click
  // --------------------------
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleTheme();
    });
  }
})();
