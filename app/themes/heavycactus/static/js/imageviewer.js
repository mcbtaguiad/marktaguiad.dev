document.addEventListener("DOMContentLoaded", () => {

	function isVideo(src) {
		return /\.(mp4|webm|ogg)$/i.test(src);
	}

	document.querySelectorAll(".image-viewer").forEach(viewer => {

		const main = viewer.querySelector(".viewer-main");
		const thumbsContainer = viewer.querySelector(".viewer-thumbs");

		const sources = Array.from(thumbsContainer.querySelectorAll("a"))
			.map(a => a.getAttribute("href"));

		function createThumb(src) {
			const a = document.createElement("a");
			a.href = src;
			a.className = "glightbox-thumb";

			if (isVideo(src)) {
				a.classList.add("video-thumb");

				const icon = document.createElement("div");
				icon.textContent = "";
				icon.className = "video-thumb-inner";
				a.appendChild(icon);
			} else {
				const img = document.createElement("img");
				img.src = src;
				a.appendChild(img);
			}

			a.addEventListener("click", (e) => {
				e.preventDefault();
				setMain(src);
			});

			return a;
		}

		// function setMain(src) {
		// 	main.innerHTML = "";
		//
		// 	const link = document.createElement("a");
		// 	link.href = src;
		// 	link.className = "glightbox-thumb";
		//
		// 	if (isVideo(src)) {
		// 		link.setAttribute("data-type", "video");
		// 		link.setAttribute("data-source", "local");
		//
		// 		const video = document.createElement("video");
		// 		video.src = src;
		// 		video.controls = true;
		// 		video.muted = true;
		// 		video.playsInline = true;
		//
		// 		link.appendChild(video);
		// 	} else {
		// 		const img = document.createElement("img");
		// 		img.src = src;
		// 		link.appendChild(img);
		// 	}
		//
		// 	main.appendChild(link);
		// }

		// rebuild thumbs
		thumbsContainer.innerHTML = "";
		sources.forEach(src => thumbsContainer.appendChild(createThumb(src)));

		// init GLightbox AFTER DOM is ready
		const lightbox = GLightbox({
			selector: ".glightbox-thumb",
			touchNavigation: true,
			loop: true,
			plyr: {
				css: "https://cdn.plyr.io/3.7.8/plyr.css",
				js: "https://cdn.plyr.io/3.7.8/plyr.js"
			}
		});

		// init first
		// if (sources.length > 0) {
		// 	setMain(sources[0]);
		// }

	});

});
