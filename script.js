const navbar = document.getElementById("navbar");
const STORAGE_KEY = "sithinemMenuItems";

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

function getStoredItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveStoredItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function createProductCard(item) {
  const card = document.createElement("article");
  card.className = item.category === "offres" ? "product-card product-offer" : "product-card";

  const title = document.createElement("h3");
  title.textContent = item.name;

  const description = document.createElement("p");
  description.textContent = item.description;

  const price = document.createElement("strong");
  price.textContent = item.price;

  card.append(title, description, price);
  return card;
}

function renderMenuItems() {
  const items = getStoredItems();

  items.forEach((item) => {
    const list = document.querySelector(`[data-category-list="${item.category}"]`);
    if (list) {
      list.appendChild(createProductCard(item));
    }
  });
}

function renderAdminItems() {
  const list = document.getElementById("admin-added-list");
  if (!list) {
    return;
  }

  const items = getStoredItems();
  list.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun article ajouté pour le moment.";
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = createProductCard(item);
    const category = document.createElement("span");
    category.className = "admin-category-label";
    category.textContent = item.category;
    card.prepend(category);
    list.appendChild(card);
  });
}

function initAdminForm() {
  const form = document.getElementById("admin-product-form");
  const clearButton = document.getElementById("clear-admin-items");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const item = {
      name: formData.get("name").trim(),
      category: formData.get("category"),
      description: formData.get("description").trim(),
      price: formData.get("price").trim(),
    };

    const items = getStoredItems();
    items.push(item);
    saveStoredItems(items);

    form.reset();
    renderAdminItems();
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      saveStoredItems([]);
      renderAdminItems();
    });
  }

  renderAdminItems();
}

window.addEventListener("scroll", handleNavbarScroll);
handleNavbarScroll();
renderMenuItems();
initAdminForm();
