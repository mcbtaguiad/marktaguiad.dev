(() => {
    const STORAGE_KEY = 'theme';
    const DARK = 'dark';
    const LIGHT = 'light';
  
    const html = document.documentElement;
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
  
    function applyTheme(theme) {
      const isDark = theme === DARK;
  
      html.classList.toggle('theme-dark', isDark);
      html.classList.toggle('theme-light', !isDark);
  
      localStorage.setItem(STORAGE_KEY, theme);
      updateIcon(isDark);
      setGiscusTheme(isDark ? 'dark' : 'light');
    }
  
    function updateIcon(isDark) {
      if (!icon) return;
  
      icon.classList.remove(
        'fa-solid',
        'fa-regular',
        'fa-moon'
      );
  
      if (isDark) {
        icon.classList.add('fa-solid', 'fa-moon');
      } else {
        icon.classList.add('fa-regular', 'fa-moon');
      }
    }
  
    function setGiscusTheme(theme) {
      const iframe = document.querySelector('iframe.giscus-frame');
      if (!iframe) return;
  
      iframe.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme: theme
            }
          }
        },
        'https://giscus.app'
      );
    }
  
    function toggleTheme() {
      const current = localStorage.getItem(STORAGE_KEY) || LIGHT;
      applyTheme(current === DARK ? LIGHT : DARK);
    }
  
    // Initial load
    document.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem(STORAGE_KEY) || LIGHT;
      applyTheme(saved);
    });
  
    // Toggle click
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // important since it's near title/home link
        toggleTheme();
      });
    }
  })();