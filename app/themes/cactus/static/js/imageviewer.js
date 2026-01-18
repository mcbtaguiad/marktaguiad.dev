document.querySelectorAll(".image-viewer").forEach(viewer => {
    const images = viewer.dataset.images.split(",");
    let index = 0;
  
    const img = viewer.querySelector(".viewer-img");
    const next = viewer.querySelector(".next");
    const prev = viewer.querySelector(".prev");
  
    next.addEventListener("click", () => {
      index = (index + 1) % images.length;
      img.src = images[index];
    });
  
    prev.addEventListener("click", () => {
      index = (index - 1 + images.length) % images.length;
      img.src = images[index];
    });
  });