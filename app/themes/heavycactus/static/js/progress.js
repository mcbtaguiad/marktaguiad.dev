window.addEventListener("DOMContentLoaded", () => {
	const progressBar = document.getElementById("progress-bar");

	if (!progressBar) return;

	window.addEventListener("scroll", () => {
		const scrollTop = document.documentElement.scrollTop;
		const scrollHeight =
			document.documentElement.scrollHeight -
			document.documentElement.clientHeight;

		const progress = (scrollTop / scrollHeight) * 100;

		progressBar.style.width = progress + "%";
	});
});
