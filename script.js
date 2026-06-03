const navbar = document.getElementById("navbar");
const STORAGE_KEY = "sithinemMenuItems";
const BLOCKED_STORAGE_KEY = "sithinemBlockedSlots";
const OPEN_DAYS = [5, 6];

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

function getBlockedSlots() {
  try {
    return JSON.parse(localStorage.getItem(BLOCKED_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveBlockedSlots(slots) {
  localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(slots));
}

function getCategoryLabel(category) {
  const labels = {
    woks: "Nos Woks",
    snacks: "Nos Snacks",
    salades: "Nos Salades",
    boissons: "Nos Boissons",
    desserts: "Nos Desserts",
    offres: "Offres / Menus",
  };

  return labels[category] || category;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function createProductCard(item) {
  const card = document.createElement("article");
  card.className = item.category === "offres" ? "product-card product-offer" : "product-card";

  if (item.image) {
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.name;
    image.className = "product-card-image";
    card.appendChild(image);
  }

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
    updateAdminSummary();
    return;
  }

  const items = getStoredItems();
  list.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun article ajouté pour le moment.";
    list.appendChild(empty);
    updateAdminSummary();
    return;
  }

  items.forEach((item) => {
    const card = createProductCard(item);
    const category = document.createElement("span");
    category.className = "admin-category-label";
    category.textContent = getCategoryLabel(item.category);
    card.prepend(category);
    list.appendChild(card);
  });

  updateAdminSummary();
}

function updateAdminSummary() {
  const itemCount = document.getElementById("summary-items-count");
  const blockedCount = document.getElementById("summary-blocked-count");

  if (itemCount) {
    itemCount.textContent = getStoredItems().length;
  }

  if (blockedCount) {
    blockedCount.textContent = getBlockedSlots().length;
  }
}

function initAdminTabs() {
  const tabs = document.querySelectorAll("[data-admin-tab]");
  const panels = document.querySelectorAll("[data-admin-panel]");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.adminTab;

      tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.adminPanel === target);
      });
    });
  });
}

function initAdminForm() {
  const form = document.getElementById("admin-product-form");
  const clearButton = document.getElementById("clear-admin-items");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const imageFile = formData.get("image");
    const item = {
      name: formData.get("name").trim(),
      category: formData.get("category"),
      description: formData.get("description").trim(),
      price: formData.get("price").trim(),
      image: await fileToDataUrl(imageFile),
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

function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isOpenDay(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return OPEN_DAYS.includes(date.getDay());
}

function renderBlockedSlots() {
  const list = document.getElementById("blocked-list");
  if (!list) {
    updateAdminSummary();
    return;
  }

  const slots = getBlockedSlots();
  list.innerHTML = "";

  if (slots.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun créneau bloqué pour le moment.";
    list.appendChild(empty);
    updateAdminSummary();
    return;
  }

  slots.forEach((slot, index) => {
    const item = document.createElement("article");
    item.className = "blocked-item";

    const text = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = formatDateLabel(slot.date);

    const details = document.createElement("p");
    details.textContent = slot.type === "day" ? "Toute la soirée est bloquée" : `${slot.start} - ${slot.end}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-action";
    button.textContent = "Retirer";
    button.addEventListener("click", () => {
      const nextSlots = getBlockedSlots().filter((_, itemIndex) => itemIndex !== index);
      saveBlockedSlots(nextSlots);
      renderBlockedSlots();
    });

    text.append(title, details);
    item.append(text, button);
    list.appendChild(item);
  });

  updateAdminSummary();
}

function initBlockedSlots() {
  const form = document.getElementById("admin-block-form");
  const typeSelect = document.getElementById("blocked-type");
  const timeRow = document.getElementById("blocked-time-row");
  const note = document.getElementById("schedule-note");

  if (!form) {
    return;
  }

  function updateTimeVisibility() {
    if (timeRow && typeSelect) {
      timeRow.hidden = typeSelect.value === "day";
    }
  }

  typeSelect.addEventListener("change", updateTimeVisibility);
  updateTimeVisibility();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const date = formData.get("date");
    const type = formData.get("type");

    if (!isOpenDay(date)) {
      note.textContent = "Choisis un vendredi ou un samedi : Sithinem est ouvert uniquement ces deux soirs.";
      note.classList.add("warning-note");
      return;
    }

    const slot = {
      date,
      type,
      start: formData.get("start"),
      end: formData.get("end"),
    };

    const slots = getBlockedSlots();
    slots.push(slot);
    saveBlockedSlots(slots);

    form.reset();
    note.textContent = "Créneau bloqué. Ouverture normale : vendredi et samedi, de 18h30 à 22h30.";
    note.classList.remove("warning-note");
    updateTimeVisibility();
    renderBlockedSlots();
  });

  renderBlockedSlots();
}

window.addEventListener("scroll", handleNavbarScroll);
handleNavbarScroll();
renderMenuItems();
initAdminTabs();
initAdminForm();
initBlockedSlots();
updateAdminSummary();
