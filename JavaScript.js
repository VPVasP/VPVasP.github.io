document.querySelectorAll(".image-gallery img").forEach(img => {
    img.addEventListener("click", function() {
        const link = this.getAttribute("data-link");
        if (link) {
            window.open(link, "_blank"); // Opens in a new tab
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
  if (navigator.userAgent.includes("Instagram")) {
    document.querySelectorAll('.thesis-section iframe, .thesis-section a').forEach(el => {
      el.style.display = 'none';
    });

    const warning = document.createElement('p');
    warning.textContent = "📱 PDF downloads may not work correctly in Instagram. Tap the 3 dots ⋮ and select 'Open in Browser'.";
    warning.style.color = "#ff8080";
    warning.style.textAlign = "center";
    warning.style.marginTop = "20px";
    warning.style.fontSize = "1rem";

    document.querySelector('.thesis-section').appendChild(warning);
  }
});