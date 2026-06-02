const navbar = document.getElementById("navbar");

function handleNavbarScroll() {
  if (!navbar) {
    return;
  }

  if (window.scrollY > 30) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
}

window.addEventListener("scroll", handleNavbarScroll);
handleNavbarScroll();
