const navbar = document.getElementById("navbar");
const STORAGE_KEY = "sithinemMenuItems";
const BLOCKED_STORAGE_KEY = "sithinemBlockedSlots";
const SLOT_TIMES = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
let currentWeekStart = getStartOfWeek(new Date());
let exclusiveProducts = [];

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
    if (!file || !file.size) {
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

  card.append(title, description);

  if (item.offerProducts?.length || item.exclusiveProducts?.length) {
    const details = document.createElement("ul");
    details.className = "offer-details";

    [...(item.offerProducts || []), ...(item.exclusiveProducts || [])].forEach((product) => {
      const detail = document.createElement("li");
      detail.textContent = product;
      details.appendChild(detail);
    });

    card.appendChild(details);
  }

  card.appendChild(price);
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
    empty.textContent = "Aucun article ou offre ajouté pour le moment.";
    list.appendChild(empty);
    updateAdminSummary();
    renderOfferProductList();
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
  renderOfferProductList();
}

function activateAdminTab(target) {
  const tabs = document.querySelectorAll("[data-admin-tab]");
  const panels = document.querySelectorAll("[data-admin-panel]");

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.adminTab === target);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.adminPanel === target);
  });
}

function initAdminTabs() {
  const tabs = document.querySelectorAll("[data-admin-tab]");
  const openers = document.querySelectorAll("[data-admin-open]");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateAdminTab(tab.dataset.adminTab));
  });

  openers.forEach((opener) => {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      activateAdminTab(opener.dataset.adminOpen);
      document.querySelector(".admin-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initProductForm() {
  const form = document.getElementById("admin-product-form");
  const clearButton = document.getElementById("clear-admin-items");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: "article",
      name: formData.get("name").trim(),
      category: formData.get("category"),
      description: formData.get("description").trim(),
      price: formData.get("price").trim(),
      image: await fileToDataUrl(formData.get("image")),
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
      exclusiveProducts = [];
      renderExclusiveProducts();
      renderAdminItems();
    });
  }
}

function renderOfferProductList() {
  const list = document.getElementById("offer-product-list");
  if (!list) {
    return;
  }

  const articles = getStoredItems().filter((item) => item.category !== "offres");
  list.innerHTML = "";

  if (articles.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state small-empty";
    empty.textContent = "Aucun produit créé pour le moment.";
    list.appendChild(empty);
    return;
  }

  articles.forEach((item) => {
    const label = document.createElement("label");
    label.className = "choice-row";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "existingProducts";
    input.value = item.name;

    const span = document.createElement("span");
    span.textContent = `${item.name} - ${item.price}`;

    label.append(input, span);
    list.appendChild(label);
  });
}

function renderExclusiveProducts() {
  const list = document.getElementById("exclusive-product-list");
  if (!list) {
    return;
  }

  list.innerHTML = "";

  exclusiveProducts.forEach((product, index) => {
    const item = document.createElement("div");
    item.className = "exclusive-chip";

    const text = document.createElement("span");
    text.textContent = product;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Retirer";
    button.addEventListener("click", () => {
      exclusiveProducts.splice(index, 1);
      renderExclusiveProducts();
    });

    item.append(text, button);
    list.appendChild(item);
  });
}

function initOfferForm() {
  const form = document.getElementById("admin-offer-form");
  const addExclusiveButton = document.getElementById("add-exclusive-product");
  const exclusiveInput = document.getElementById("exclusive-product-name");

  if (!form) {
    return;
  }

  addExclusiveButton?.addEventListener("click", () => {
    const value = exclusiveInput.value.trim();
    if (!value) {
      return;
    }

    exclusiveProducts.push(value);
    exclusiveInput.value = "";
    renderExclusiveProducts();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const selectedProducts = Array.from(form.querySelectorAll('input[name="existingProducts"]:checked')).map((input) => input.value);

    const offer = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: "offer",
      name: formData.get("name").trim(),
      category: "offres",
      description: formData.get("description").trim(),
      price: formData.get("price").trim(),
      image: await fileToDataUrl(formData.get("image")),
      offerProducts: selectedProducts,
      exclusiveProducts: [...exclusiveProducts],
    };

    const items = getStoredItems();
    items.push(offer);
    saveStoredItems(items);
    exclusiveProducts = [];
    form.reset();
    renderExclusiveProducts();
    renderAdminItems();
  });
}

function getStartOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateValue(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function getSlotKey(dateValue, time) {
  return `${dateValue}_${time}`;
}

function renderWeeklyCalendar() {
  const calendar = document.getElementById("weekly-calendar");
  const label = document.getElementById("week-label");

  if (!calendar) {
    updateAdminSummary();
    return;
  }

  const friday = addDays(currentWeekStart, 4);
  const saturday = addDays(currentWeekStart, 5);
  const blockedSlots = getBlockedSlots();

  if (label) {
    label.textContent = `Semaine du ${currentWeekStart.toLocaleDateString("fr-FR")}`;
  }

  calendar.innerHTML = "";

  [friday, saturday].forEach((date) => {
    const dateValue = formatDateValue(date);
    const day = document.createElement("section");
    day.className = "calendar-day";

    const title = document.createElement("h3");
    title.textContent = formatDateLabel(date);

    const slots = document.createElement("div");
    slots.className = "slot-grid";

    SLOT_TIMES.forEach((time) => {
      const key = getSlotKey(dateValue, time);
      const blocked = blockedSlots.includes(key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = blocked ? "slot-button is-blocked" : "slot-button";
      button.textContent = time;
      button.setAttribute("aria-pressed", String(blocked));
      button.addEventListener("click", () => toggleBlockedSlot(key));
      slots.appendChild(button);
    });

    day.append(title, slots);
    calendar.appendChild(day);
  });

  updateAdminSummary();
}

function toggleBlockedSlot(key) {
  const blockedSlots = getBlockedSlots();
  const exists = blockedSlots.includes(key);
  const nextSlots = exists ? blockedSlots.filter((slot) => slot !== key) : [...blockedSlots, key];
  saveBlockedSlots(nextSlots);
  renderWeeklyCalendar();
}

function initWeeklyCalendar() {
  const previous = document.getElementById("previous-week");
  const next = document.getElementById("next-week");

  previous?.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderWeeklyCalendar();
  });

  next?.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderWeeklyCalendar();
  });

  renderWeeklyCalendar();
}

window.addEventListener("scroll", handleNavbarScroll);
handleNavbarScroll();
renderMenuItems();
initAdminTabs();
initProductForm();
initOfferForm();
renderAdminItems();
renderOfferProductList();
renderExclusiveProducts();
initWeeklyCalendar();
updateAdminSummary();
