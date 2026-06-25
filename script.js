const navbar = document.getElementById("navbar");
const STORAGE_KEY = "sithinemMenuItems";
const CATEGORY_STORAGE_KEY = "sithinemMenuCategories";
const BLOCKED_STORAGE_KEY = "sithinemBlockedSlots";
const SLOT_TIMES = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
const DEFAULT_CATEGORIES = [
  { id: "woks", label: "Nos Woks" },
  { id: "snacks", label: "Nos Snacks" },
  { id: "salades", label: "Nos Salades" },
  { id: "boissons", label: "Nos Boissons" },
  { id: "desserts", label: "Nos Desserts" },
  { id: "offres", label: "Offres" },
];
let currentWeekStart = getStartOfWeek(new Date());
let activeMenuCategory = getCategories()[0]?.id || "woks";
let selectedMenuItemId = null;

function handleNavbarScroll() {
  if (!navbar) return;
  navbar.classList.toggle("scrolled", window.scrollY > 30);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredItems() {
  return readJson(STORAGE_KEY, []).map((item) => ({ visible: true, type: "article", ...item }));
}

function saveStoredItems(items) {
  writeJson(STORAGE_KEY, items);
}

function getCategories() {
  const stored = readJson(CATEGORY_STORAGE_KEY, null);
  return Array.isArray(stored) && stored.length ? stored : DEFAULT_CATEGORIES;
}

function saveCategories(categories) {
  writeJson(CATEGORY_STORAGE_KEY, categories);
}

function hasCustomMenuData() {
  return Boolean(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(CATEGORY_STORAGE_KEY));
}

function getBlockedSlots() {
  return readJson(BLOCKED_STORAGE_KEY, []);
}

function saveBlockedSlots(slots) {
  writeJson(BLOCKED_STORAGE_KEY, slots);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `onglet-${Date.now()}`;
}

function createId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  if (item.visible === false) return document.createDocumentFragment();

  const card = document.createElement("article");
  card.className = item.type === "offer" || item.category === "offres" ? "product-card product-offer" : "product-card";

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
  if (document.querySelector(".menu-page") && hasCustomMenuData()) {
    renderPublicManagedMenu();
    return;
  }

  getStoredItems().forEach((item) => {
    const list = document.querySelector(`[data-category-list="${item.category}"]`);
    if (list && item.visible !== false) list.appendChild(createProductCard(item));
  });
}

function renderPublicManagedMenu() {
  const main = document.querySelector(".menu-page");
  if (!main) return;

  main.querySelectorAll(".category-tabs, .product-section").forEach((node) => node.remove());
  const categories = getCategories();
  const visibleItems = getStoredItems().filter((item) => item.visible !== false);
  const tabs = document.createElement("nav");
  tabs.className = "category-tabs";
  tabs.setAttribute("aria-label", "Catégories de la carte");

  categories.forEach((category) => {
    const link = document.createElement("a");
    link.href = `#${category.id}`;
    link.textContent = category.label;
    tabs.appendChild(link);
  });
  main.appendChild(tabs);

  categories.forEach((category) => {
    const section = document.createElement("section");
    section.id = category.id;
    section.className = "product-section";
    const heading = document.createElement("div");
    heading.className = "product-heading compact-heading";
    const headingInner = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = category.label;
    const subtitle = document.createElement("p");
    subtitle.textContent = "Découvrez les produits disponibles à emporter.";
    headingInner.append(title, subtitle);
    heading.appendChild(headingInner);
    const grid = document.createElement("div");
    grid.className = "product-grid";
    grid.dataset.categoryList = category.id;
    const categoryItems = visibleItems.filter((item) => item.category === category.id);
    if (categoryItems.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucun produit disponible pour le moment.";
      grid.appendChild(empty);
    } else {
      categoryItems.forEach((item) => grid.appendChild(createProductCard(item)));
    }
    section.append(heading, grid);
    main.appendChild(section);
  });
}

function updateAdminSummary() {
  const itemCount = document.getElementById("summary-items-count");
  const blockedCount = document.getElementById("summary-blocked-count");
  if (itemCount) itemCount.textContent = getStoredItems().filter((item) => item.visible !== false).length;
  if (blockedCount) blockedCount.textContent = getBlockedSlots().length;
}

function activateAdminTab(target) {
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.adminTab === target));
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.adminPanel === target));
}

function initAdminTabs() {
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => tab.addEventListener("click", () => activateAdminTab(tab.dataset.adminTab)));
  document.querySelectorAll("[data-admin-open]").forEach((opener) => {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      activateAdminTab(opener.dataset.adminOpen);
      document.querySelector(".admin-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderMiniMenuTabs() {
  const tabs = document.getElementById("mini-menu-tabs");
  if (!tabs) return;
  const categories = getCategories();
  if (!categories.some((category) => category.id === activeMenuCategory)) activeMenuCategory = categories[0]?.id || "woks";
  tabs.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = category.id === activeMenuCategory ? "mini-menu-tab is-active" : "mini-menu-tab";
    button.textContent = category.label;
    button.addEventListener("click", () => {
      activeMenuCategory = category.id;
      selectedMenuItemId = null;
      renderMiniMenu();
      renderEditor();
    });
    tabs.appendChild(button);
  });
}

function renderMiniMenu() {
  renderMiniMenuTabs();
  const grid = document.getElementById("mini-menu-grid");
  if (!grid) return;
  const items = getStoredItems().filter((item) => item.category === activeMenuCategory);
  grid.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "editor-empty";
    empty.textContent = "Aucun élément dans cet onglet pour le moment.";
    grid.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mini-menu-card";
    card.classList.toggle("is-selected", item.id === selectedMenuItemId);
    card.classList.toggle("is-hidden", item.visible === false);
    if (item.image) {
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = item.name;
      card.appendChild(image);
    }
    const body = document.createElement("div");
    body.className = "mini-card-body";
    const title = document.createElement("h3");
    title.textContent = item.name || "Sans nom";
    const description = document.createElement("p");
    description.textContent = item.description || "Sans description";
    const meta = document.createElement("div");
    meta.className = "mini-card-meta";
    const price = document.createElement("span");
    price.textContent = item.price || "Prix non défini";
    const state = document.createElement("span");
    state.className = item.visible === false ? "hidden-pill" : "type-pill";
    state.textContent = item.visible === false ? "Masqué" : item.type === "offer" ? "Offre" : "Article";
    meta.append(price, state);
    body.append(title, description, meta);
    card.appendChild(body);
    card.addEventListener("click", () => {
      selectedMenuItemId = item.id;
      renderMiniMenu();
      renderEditor();
    });
    grid.appendChild(card);
  });
}

function renderEditor() {
  const editor = document.getElementById("admin-editor");
  if (!editor) return;
  const items = getStoredItems();
  const item = items.find((entry) => entry.id === selectedMenuItemId);
  const categories = getCategories();
  if (!item) {
    editor.innerHTML = `<h2>Détail</h2><p class="editor-empty">Clique sur un article ou une offre de la mini-carte pour modifier ses informations.</p>`;
    return;
  }
  editor.innerHTML = `
    <h2>${item.type === "offer" ? "Modifier l'offre" : "Modifier l'article"}</h2>
    <label for="edit-name">Nom</label>
    <input id="edit-name" type="text" value="${escapeAttribute(item.name || "")}" />
    <label for="edit-category">Onglet</label>
    <select id="edit-category">${categories.map((category) => `<option value="${category.id}" ${category.id === item.category ? "selected" : ""}>${category.label}</option>`).join("")}</select>
    <label for="edit-description">Description</label>
    <textarea id="edit-description" rows="4">${escapeHtml(item.description || "")}</textarea>
    <label for="edit-price">Prix</label>
    <input id="edit-price" type="text" value="${escapeAttribute(item.price || "")}" />
    <label for="edit-image">Image</label>
    <input id="edit-image" type="file" accept="image/*" />
    ${item.type === "offer" ? `<label for="edit-offer-lines">Produits dans l'offre</label><textarea id="edit-offer-lines" rows="4">${escapeHtml([...(item.offerProducts || []), ...(item.exclusiveProducts || [])].join("\n"))}</textarea>` : ""}
    <div class="editor-actions">
      <button type="button" class="secondary-action" id="toggle-visible">${item.visible === false ? "Rendre visible" : "Masquer"}</button>
      <button type="button" class="danger-action" id="delete-item">Supprimer</button>
    </div>
    <button type="button" class="primary-action" id="save-item">Enregistrer</button>`;
  document.getElementById("save-item").addEventListener("click", saveEditedItem);
  document.getElementById("toggle-visible").addEventListener("click", toggleEditedItemVisibility);
  document.getElementById("delete-item").addEventListener("click", deleteEditedItem);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

async function saveEditedItem() {
  const items = getStoredItems();
  const index = items.findIndex((entry) => entry.id === selectedMenuItemId);
  if (index === -1) return;
  const image = await fileToDataUrl(document.getElementById("edit-image").files[0]);
  const nextCategory = document.getElementById("edit-category").value;
  items[index] = {
    ...items[index],
    name: document.getElementById("edit-name").value.trim(),
    category: nextCategory,
    description: document.getElementById("edit-description").value.trim(),
    price: document.getElementById("edit-price").value.trim(),
    image: image || items[index].image,
  };
  if (items[index].type === "offer") {
    items[index].offerProducts = document.getElementById("edit-offer-lines").value.split("\n").map((line) => line.trim()).filter(Boolean);
    items[index].exclusiveProducts = [];
  }
  saveStoredItems(items);
  activeMenuCategory = nextCategory;
  renderMiniMenu();
  renderEditor();
  updateAdminSummary();
}

function toggleEditedItemVisibility() {
  const items = getStoredItems();
  const index = items.findIndex((entry) => entry.id === selectedMenuItemId);
  if (index === -1) return;
  items[index].visible = items[index].visible === false;
  saveStoredItems(items);
  renderMiniMenu();
  renderEditor();
  updateAdminSummary();
}

function deleteEditedItem() {
  if (!confirm("Supprimer définitivement cet élément de la carte ?")) return;
  const items = getStoredItems().filter((entry) => entry.id !== selectedMenuItemId);
  selectedMenuItemId = null;
  saveStoredItems(items);
  renderMiniMenu();
  renderEditor();
  updateAdminSummary();
}

function createMenuItem(type) {
  const category = type === "offer" ? (getCategories().find((item) => item.id === "offres")?.id || activeMenuCategory) : activeMenuCategory;
  const item = {
    id: createId(),
    type,
    category,
    name: type === "offer" ? "Nouvelle offre" : "Nouvel article",
    description: "Description à compléter",
    price: "0,00 €",
    image: "",
    visible: false,
    offerProducts: type === "offer" ? [] : undefined,
    exclusiveProducts: type === "offer" ? [] : undefined,
  };
  const items = getStoredItems();
  items.push(item);
  saveStoredItems(items);
  activeMenuCategory = category;
  selectedMenuItemId = item.id;
  renderMiniMenu();
  renderEditor();
  updateAdminSummary();
}

function initMiniMenuAdmin() {
  if (!document.getElementById("mini-menu-grid")) return;
  document.getElementById("create-article")?.addEventListener("click", () => createMenuItem("article"));
  document.getElementById("create-offer")?.addEventListener("click", () => createMenuItem("offer"));
  document.getElementById("add-menu-tab")?.addEventListener("click", addMenuTab);
  document.getElementById("new-menu-tab-name")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addMenuTab();
    }
  });
  document.getElementById("delete-menu-tab")?.addEventListener("click", deleteActiveMenuTab);
  renderMiniMenu();
  renderEditor();
}

function addMenuTab() {
  const input = document.getElementById("new-menu-tab-name");
  const label = input.value.trim();
  if (!label) {
    input.focus();
    return;
  }
  const categories = getCategories();
  let id = slugify(label);
  if (categories.some((category) => category.id === id)) id = `${id}-${Date.now()}`;
  categories.push({ id, label });
  saveCategories(categories);
  activeMenuCategory = id;
  selectedMenuItemId = null;
  input.value = "";
  renderMiniMenu();
  renderEditor();
}

function deleteActiveMenuTab() {
  const categories = getCategories();
  if (categories.length <= 1) return;
  const category = categories.find((entry) => entry.id === activeMenuCategory);
  if (!confirm(`Supprimer l'onglet "${category?.label || activeMenuCategory}" et tous les produits dedans ?`)) return;
  const nextCategories = categories.filter((entry) => entry.id !== activeMenuCategory);
  const items = getStoredItems().filter((item) => item.category !== activeMenuCategory);
  saveCategories(nextCategories);
  saveStoredItems(items);
  activeMenuCategory = nextCategories[0].id;
  selectedMenuItemId = null;
  renderMiniMenu();
  renderEditor();
  updateAdminSummary();
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
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
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
  if (label) label.textContent = `Semaine du ${currentWeekStart.toLocaleDateString("fr-FR")}`;
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
  saveBlockedSlots(exists ? blockedSlots.filter((slot) => slot !== key) : [...blockedSlots, key]);
  renderWeeklyCalendar();
}

function initWeeklyCalendar() {
  document.getElementById("previous-week")?.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderWeeklyCalendar();
  });
  document.getElementById("next-week")?.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderWeeklyCalendar();
  });
  renderWeeklyCalendar();
}

window.addEventListener("scroll", handleNavbarScroll);
handleNavbarScroll();
renderMenuItems();
initAdminTabs();
initMiniMenuAdmin();
initWeeklyCalendar();
updateAdminSummary();
