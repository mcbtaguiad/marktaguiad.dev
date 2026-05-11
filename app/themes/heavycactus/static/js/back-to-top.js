document.addEventListener('DOMContentLoaded', () => {
	const button = document.getElementById('back-to-top');

	if (!button) return;

	window.addEventListener('scroll', () => {
		const scrollPercent =
			(window.scrollY /
				(document.documentElement.scrollHeight - window.innerHeight)) *
			100;

		if (scrollPercent > 30) {
			button.classList.add('show');
		} else {
			button.classList.remove('show');
		}
	});

	button.addEventListener('click', () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	});
});
