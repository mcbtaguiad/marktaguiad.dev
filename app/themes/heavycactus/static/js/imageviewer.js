document.querySelectorAll(".image-viewer").forEach(viewer => {
    const media = viewer.dataset.media.split(",").map(m => m.trim());
    let index = 0;
  
    const stage = viewer.querySelector(".viewer-stage");
    const next = viewer.querySelector(".next");
    const prev = viewer.querySelector(".prev");
  
    function isVideo(src) {
      return /\.(mp4|webm|ogg)$/i.test(src);
    }
  
    function render() {
      stage.innerHTML = "";
  
      const src = media[index];
  
      if (isVideo(src)) {
        const video = document.createElement("video");
        video.src = src;
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        stage.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = src;
        stage.appendChild(img);
      }
    }
  
    next.addEventListener("click", () => {
      index = (index + 1) % media.length;
      render();
    });
  
    prev.addEventListener("click", () => {
      index = (index - 1 + media.length) % media.length;
      render();
    });
  
    render();
  });