document.querySelectorAll(".image-gallery img").forEach(img => {
    img.addEventListener("click", function() {
        const link = this.getAttribute("data-link");
        if (link) {
            window.open(link, "_blank"); // Opens in a new tab
        }
    });
});