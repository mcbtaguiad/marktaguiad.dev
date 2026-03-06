function updateThemeImages() {
	const isDark = document.documentElement.classList.contains("theme-dark");

	document.querySelectorAll(".theme-image").forEach(img => {
		const light = img.dataset.light;
		const dark = img.dataset.dark;

		if (!light || !dark) return;

		img.src = isDark ? dark : light;
	});
}

// run on page load
document.addEventListener("DOMContentLoaded", updateThemeImages);

// observe theme class changes
const observer = new MutationObserver(updateThemeImages);

observer.observe(document.documentElement, {
	attributes: true,
	attributeFilter: ["class"]
});
