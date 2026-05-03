(() => {
	const STORAGE_KEY = 'theme';
	const DARK = 'dark';
	const LIGHT = 'light';

	const html = document.documentElement;
	const toggleBtn = document.getElementById('theme-toggle');
	const icon = document.getElementById('theme-icon');

	// --------------------------
	// Determine initial theme
	// --------------------------
	const saved = localStorage.getItem(STORAGE_KEY);
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const initialTheme = saved || (prefersDark ? DARK : LIGHT);

	// Apply initial theme immediately to prevent FOUC
	html.classList.add(initialTheme === DARK ? 'theme-dark' : 'theme-light');

	// --------------------------
	// Pre-set widget themes before they load
	// --------------------------
	const setPreloadWidgetThemes = (theme) => {
		// Giscus
		const giscusScript = document.querySelector('script[src*="giscus.app/client.js"]');
		if (giscusScript) giscusScript.dataset.theme = theme === DARK ? 'dark' : 'light';

		// Utterances
		const utterancesScript = document.querySelector('script[src*="utteranc.es/client.js"]');
		if (utterancesScript) utterancesScript.setAttribute('theme', theme === DARK ? 'github-dark' : 'github-light');
	};

	setPreloadWidgetThemes(initialTheme);

	// --------------------------
	// Update FontAwesome icon
	// --------------------------
	function updateIcon(isDark) {
		if (!icon) return;
		icon.className = '';
		icon.classList.add(isDark ? 'fa-solid' : 'fa-regular', 'fa-moon');
	}

	// --------------------------
	// Widget theme helpers
	// --------------------------
	const widgets = {
		// giscus: (theme) => {
		// 	const iframe = document.querySelector('iframe.giscus-frame');
		//
		// 	if (!iframe) return;
		//
		// 	const sendTheme = () => {
		// 		iframe.contentWindow.postMessage(
		// 			{ giscus: { setConfig: { theme } } },
		// 			'https://giscus.app'
		// 		);
		// 	};
		//
		// 	// If already loaded
		// 	if (iframe.contentWindow) {
		// 		sendTheme();
		// 	}
		//
		// 	// Ensure it fires when ready
		// 	iframe.addEventListener('load', sendTheme);
		// },
		giscus: (theme) => {
			let retries = 0;
			const maxRetries = 20;

			const apply = () => {
				const iframe = document.querySelector('iframe.giscus-frame');

				if (!iframe) {
					if (retries++ < maxRetries) {
						setTimeout(apply, 200);
					}
					return;
				}

				iframe.contentWindow.postMessage(
					{ giscus: { setConfig: { theme } } },
					'https://giscus.app'
				);
			};

			apply();
		},

		utterances: (theme) => {
			const iframe = document.querySelector('.utterances-frame');
			if (iframe) iframe.contentWindow.postMessage({ type: 'set-theme', theme }, 'https://utteranc.es');
		},

		remark42: (theme) => {
			const container = document.getElementById('remark42');
			if (!container) return;
			container.innerHTML = '';
			if (window.remark_config) window.remark_config.theme = theme;
			const script = document.createElement('script');
			script.src = `${remark_config.host}/web/embed.js`;
			script.defer = true;
			document.body.appendChild(script);
		},

		isso: (theme) => {
			const thread = document.getElementById('isso-thread');
			if (!thread) return;
			thread.innerHTML = '';
			const s = document.createElement('script');
			(document.head || document.body).appendChild(s);
		},
	};

	// --------------------------
	// Apply theme dynamically
	// --------------------------
	function applyTheme(theme) {
		const isDark = theme === DARK;
		html.classList.toggle('theme-dark', isDark);
		html.classList.toggle('theme-light', !isDark);
		localStorage.setItem(STORAGE_KEY, theme);
		updateIcon(isDark);

		// Widget themes
		widgets.giscus(isDark ? 'dark' : 'light');
		widgets.utterances(isDark ? 'github-dark' : 'github-light');
		widgets.remark42(isDark ? 'dark' : 'light');
		widgets.isso(isDark ? 'dark' : 'light');
	}

	function toggleTheme() {
		const current = localStorage.getItem(STORAGE_KEY) || LIGHT;
		applyTheme(current === DARK ? LIGHT : DARK);
	}

	// --------------------------
	// Initial load
	// --------------------------
	document.addEventListener('DOMContentLoaded', () => {
		applyTheme(initialTheme);
	});

	// --------------------------
	// Toggle button
	// --------------------------
	toggleBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		toggleTheme();
	});
})();
