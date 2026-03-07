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
	// Giscus theme
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
	// Utterances theme
	// --------------------------
	function setUtterancesTheme(theme) {
		const sendTheme = (iframe) => {
			iframe.contentWindow.postMessage(
				{ type: 'set-theme', theme },
				'https://utteranc.es'
			);
		};

		const iframe = document.querySelector('.utterances-frame');

		if (iframe) {
			sendTheme(iframe);
			return;
		}

		// Wait until utterances iframe loads
		const observer = new MutationObserver((mutations, obs) => {
			const iframe = document.querySelector('.utterances-frame');
			if (iframe) {
				sendTheme(iframe);
				obs.disconnect();
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });
	}
	// --------------------------
	// Remark42 theme
	// --------------------------
	function setRemark42Theme(theme) {
		const container = document.getElementById("remark42");
		if (!container) return;

		// clear existing widget
		container.innerHTML = "";

		// update config
		if (window.remark_config) {
			window.remark_config.theme = theme;
		}

		// reload embed
		const script = document.createElement("script");
		script.src = remark_config.host + "/web/embed.js";
		script.defer = true;
		document.body.appendChild(script);
	}
	// --------------------------
	// Isso theme
	// -------------------------
	function setIssoTheme(theme) {
		const thread = document.getElementById('isso-thread');
		if (!thread) return;

		// Clear existing thread
		thread.innerHTML = '';

		// Reload Isso with new theme
		var d = document, s = d.createElement('script');
		s.src = "https://isso.marktaguiad.dev/js/embed.min.js";
		s.defer = true;
		s.setAttribute('data-isso', "https://isso.marktaguiad.dev");
		s.setAttribute('data-isso-site', "marktaguiad");
		s.setAttribute('data-isso-theme', theme);
		(d.head || d.body).appendChild(s);
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
		setUtterancesTheme(isDark ? 'github-dark' : 'github-light');
		setRemark42Theme(isDark ? 'dark' : 'light');
		setIssoTheme(isDark ? 'dark' : 'light');
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
