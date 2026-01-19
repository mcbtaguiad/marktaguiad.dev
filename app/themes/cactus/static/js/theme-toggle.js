(function () {
    const root = document.documentElement;
    const btn = document.getElementById("theme-toggle");
    const icon = document.getElementById("theme-icon");
  
    if (!btn || !icon) return;
  
    const THEMES = ["theme-dark", "theme-white"];
  
    function applyTheme(theme) {
      // remove all themes
      THEMES.forEach(t => root.classList.remove(t));
  
      // apply selected
      root.classList.add(theme);
  
      // update icon
      icon.className =
        theme === "theme-dark"
          ? "fa-solid fa-moon"
          : "fa-regular fa-moon";
  
      localStorage.setItem("theme", theme);
    }
  
    // initial load
    const saved = localStorage.getItem("theme") || "theme-white";
    applyTheme(saved);
  
    // toggle
    btn.addEventListener("click", function (e) {
      e.preventDefault(); // VERY IMPORTANT (prevents header link navigation)
  
      const isDark = root.classList.contains("theme-dark");
      applyTheme(isDark ? "theme-white" : "theme-dark");
    });
  })();