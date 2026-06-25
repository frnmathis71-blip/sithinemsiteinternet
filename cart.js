(function () {
  const CART_KEY = "sithinemCart";
  const ORDERS_KEY = "sithinemOrders";
  const BLOCKED_KEY = "sithinemBlockedSlots";
  const SLOT_TIMES = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  };
  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHtml = (value) => String(value || "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[char]);
  const slugify = (value) => String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `produit-${Date.now()}`;
  const parsePrice = (value) => Number.parseFloat(String(value || "").replace(/[^0-9,.-]/g, "").replace(",", ".")) || 0;
  const formatPrice = (value) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value || 0);
  const formatDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  function injectStyles() {
    if (document.getElementById("cart-feature-styles")) return;
    const style = document.createElement("style");
    style.id = "cart-feature-styles";
    style.textContent = `
      .cart-link{position:relative}.cart-count{position:absolute;top:-8px;right:-12px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--green);color:var(--white);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}.cart-add-button{width:100%;margin-top:18px}.cart-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,420px);gap:28px;max-width:1120px;margin:0 auto;align-items:start}.cart-panel,.checkout-panel,.order-success,.order-admin-card{background:var(--white);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow)}.cart-panel,.checkout-panel,.order-success,.order-admin-card{padding:24px}.cart-list,.checkout-form,.customer-fields,.admin-order-list{display:grid;gap:16px}.cart-item{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid var(--border)}.cart-item:last-child{border-bottom:0}.cart-item p,.admin-order-message p{color:var(--muted);line-height:1.5}.cart-item-actions{display:flex;align-items:center;gap:10px}.quantity-button,.remove-button{border:0;border-radius:6px;font:inherit;font-weight:800;cursor:pointer}.quantity-button{width:34px;height:34px;background:var(--green-soft);color:var(--green-dark)}.remove-button{min-height:34px;padding:0 12px;background:#ffe8e2;color:#963213}.cart-total-row{display:flex;justify-content:space-between;margin-top:18px;padding-top:18px;border-top:1px solid var(--border);color:var(--green-dark);font-size:22px;font-weight:800}.checkout-form label{color:var(--green-dark);font-weight:800}.checkout-form input,.checkout-form select,.checkout-form textarea{width:100%;border:1px solid var(--border);border-radius:6px;padding:13px 14px;color:var(--text);font:inherit;background:var(--white)}.connected-customer-note,.order-success,.admin-order-message{color:var(--green-dark);background:var(--green-soft);line-height:1.5}.order-admin-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:16px}.admin-order-items{display:grid;gap:8px;margin:16px 0;padding-left:18px;color:var(--muted)}.admin-order-total{color:var(--green-dark)}.admin-sync-note{margin-bottom:16px;padding:14px 16px;border-radius:8px;background:var(--green-soft);color:var(--green-dark);line-height:1.5}@media(max-width:900px){.cart-layout,.cart-item{grid-template-columns:1fr}.cart-item-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  const getCart = () => readJson(CART_KEY, []);
  const saveCart = (cart) => { writeJson(CART_KEY, cart); updateCartCount(); };
  const getOrders = () => readJson(ORDERS_KEY, []);
  const saveOrders = (orders) => {
    writeJson(ORDERS_KEY, orders);
    window.dispatchEvent(new CustomEvent("sithinem:orders-updated"));
  };
  const getTotal = (cart = getCart()) => cart.reduce((total, item) => total + (item.priceValue || 0) * (item.quantity || 0), 0);

  function updateCartCount() {
    const count = getCart().reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach((badge) => { badge.textContent = count; badge.hidden = count === 0; });
  }

  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    saveCart(cart);
  }

  function initMenuButtons() {
    document.querySelectorAll(".menu-page .product-card").forEach((card) => {
      if (card.dataset.cartReady === "true") return;
      const name = card.querySelector("h3")?.textContent.trim();
      const description = card.querySelector("p")?.textContent.trim() || "";
      const price = card.querySelector("strong")?.textContent.trim();
      if (!name || !price) return;
      const product = { id: card.dataset.productId || slugify(`${name}-${description}-${price}`), name, description, price, priceValue: parsePrice(price) };
      card.dataset.productId = product.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-action cart-add-button";
      button.textContent = "Ajouter au panier";
      button.addEventListener("click", () => {
        addToCart(product);
        const oldText = button.textContent;
        button.textContent = "Ajouté ✓";
        setTimeout(() => { button.textContent = oldText; }, 1000);
      });
      card.appendChild(button);
      card.dataset.cartReady = "true";
    });
  }

  function getCurrentCustomer() {
    for (const key of ["sithinemCurrentCustomer", "sithinemCurrentUser", "sithinemUser", "sithinemCustomer"]) {
      const value = readJson(key, null);
      if (!value) continue;
      if (typeof value === "object") return { connected: true, firstName: value.firstName || value.prenom || "", lastName: value.lastName || value.nom || value.name || "", phone: value.phone || value.telephone || value.tel || "", email: value.email || "" };
      return { connected: true, firstName: String(value), lastName: "", phone: "", email: "" };
    }
    return null;
  }

  function availableSlots(daysAhead = 21) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const blocked = readJson(BLOCKED_KEY, []);
    const slots = [];
    for (let offset = 0; offset <= daysAhead; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      if (![5, 6].includes(date.getDay())) continue;
      const dateValue = formatDateValue(date);
      SLOT_TIMES.forEach((time) => {
        const key = `${dateValue}_${time}`;
        const [hour, minute] = time.split(":").map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hour, minute, 0, 0);
        if (!blocked.includes(key) && slotDate >= now) slots.push({ key, label: `${date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })} à ${time}` });
      });
    }
    return slots;
  }

  function renderPickupOptions() {
    const select = document.getElementById("pickup-slot");
    if (!select) return;
    const slots = availableSlots();
    select.innerHTML = slots.length ? '<option value="">Choisir un créneau</option>' : '<option value="">Aucun créneau disponible</option>';
    select.disabled = slots.length === 0;
    slots.forEach((slot) => select.insertAdjacentHTML("beforeend", `<option value="${slot.key}">${slot.label}</option>`));
  }

  function renderCartPage() {
    const cartList = document.getElementById("cart-list");
    const cartEmpty = document.getElementById("cart-empty");
    const checkoutPanel = document.getElementById("checkout-panel");
    const totalOutput = document.getElementById("cart-total");
    if (!cartList || !cartEmpty || !checkoutPanel || !totalOutput) return;
    const cart = getCart();
    cartList.innerHTML = "";
    cartEmpty.hidden = cart.length > 0;
    checkoutPanel.hidden = cart.length === 0;
    cart.forEach((item) => cartList.insertAdjacentHTML("beforeend", `
      <article class="cart-item">
        <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><strong>${escapeHtml(item.price)}</strong></div>
        <div class="cart-item-actions">
          <button type="button" class="quantity-button" data-cart-action="decrease" data-cart-id="${escapeHtml(item.id)}">−</button>
          <span>${item.quantity}</span>
          <button type="button" class="quantity-button" data-cart-action="increase" data-cart-id="${escapeHtml(item.id)}">+</button>
          <button type="button" class="remove-button" data-cart-action="remove" data-cart-id="${escapeHtml(item.id)}">Retirer</button>
        </div>
      </article>`));
    totalOutput.textContent = formatPrice(getTotal(cart));
  }

  function initCartPage() {
    const form = document.getElementById("checkout-form");
    if (!form) return;
    renderPickupOptions();
    renderCartPage();
    const customer = getCurrentCustomer();
    if (customer) {
      document.getElementById("customer-fields").hidden = true;
      document.querySelectorAll("#customer-fields input").forEach((input) => { input.required = false; });
      const note = document.getElementById("connected-customer-note");
      const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "client connecté";
      note.hidden = false;
      note.textContent = `Connecté en tant que ${name}. Il reste seulement à choisir le créneau de retrait.`;
    }
    document.getElementById("cart-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-cart-action]");
      if (!button) return;
      const id = button.dataset.cartId;
      const cart = getCart();
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;
      const next = button.dataset.cartAction === "increase" ? item.quantity + 1 : item.quantity - 1;
      if (button.dataset.cartAction === "remove") saveCart(cart.filter((entry) => entry.id !== id));
      else saveCart(cart.map((entry) => entry.id === id ? { ...entry, quantity: next } : entry).filter((entry) => entry.quantity > 0));
      renderCartPage();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const cart = getCart();
      const pickupSlot = document.getElementById("pickup-slot").value;
      if (!cart.length || !pickupSlot) return alert("Choisis un créneau de retrait pour valider la commande.");
      const connected = getCurrentCustomer();
      const customer = connected || { connected: false, firstName: document.getElementById("customer-firstname").value.trim(), lastName: document.getElementById("customer-lastname").value.trim(), phone: document.getElementById("customer-phone").value.trim() };
      if (!customer.connected && (!customer.firstName || !customer.lastName || !customer.phone)) return alert("Renseigne le nom, le prénom et le numéro de téléphone.");
      const order = { id: `CMD-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), pickupSlot, message: document.getElementById("order-message").value.trim(), customer, items: cart, total: getTotal(cart), status: "Nouvelle commande" };
      saveOrders([order, ...getOrders()]);
      saveCart([]);
      form.reset();
      renderCartPage();
      const success = document.getElementById("order-success");
      success.hidden = false;
      success.textContent = `Commande ${order.id} enregistrée. L'administrateur pourra la consulter dans l'espace admin.`;
    });
  }

  function formatPickup(slotKey) {
    const [dateValue, time] = String(slotKey || "").split("_");
    if (!dateValue || !time) return "Créneau non renseigné";
    const date = new Date(`${dateValue}T00:00:00`);
    return `${date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} à ${time}`;
  }

  function renderAdminOrders() {
    const list = document.getElementById("admin-orders-list");
    const orders = getOrders();
    const count = document.getElementById("summary-orders-count");
    if (count) count.textContent = orders.length;
    if (!list) return;
    if (!orders.length) {
      list.innerHTML = '<div class="orders-empty"><h3>Aucune commande pour le moment</h3><p>Quand un client validera son panier, sa commande s\'affichera ici avec le créneau, les coordonnées, le message et le total.</p></div>';
      return;
    }
    list.innerHTML = `<p class="admin-sync-note">${orders.length} commande${orders.length > 1 ? "s" : ""} enregistrée${orders.length > 1 ? "s" : ""}. Les nouvelles commandes apparaissent automatiquement dans cet onglet.</p>` + orders.map((order) => {
      const customer = order.customer || {};
      const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Client connecté";
      const items = (order.items || []).map((item) => `<li>${escapeHtml(item.quantity)} × ${escapeHtml(item.name)} — ${formatPrice((item.priceValue || 0) * (item.quantity || 0))}</li>`).join("");
      const message = order.message ? `<div class="admin-order-message"><strong>Message client</strong><p>${escapeHtml(order.message)}</p></div>` : '<p class="form-note">Aucun message client.</p>';
      return `<article class="order-admin-card"><div class="order-admin-header"><div><p class="eyebrow">${escapeHtml(order.id)}</p><h3>${escapeHtml(customerName)}</h3></div><span class="status-pill">${escapeHtml(order.status || "Nouvelle")}</span></div><p><strong>Créneau :</strong> ${escapeHtml(formatPickup(order.pickupSlot))}</p><p><strong>Téléphone :</strong> ${escapeHtml(customer.phone || "Non renseigné")}</p><ul class="admin-order-items">${items}</ul>${message}<strong class="admin-order-total">Total : ${formatPrice(order.total || 0)}</strong></article>`;
    }).join("");
  }

  function refreshCartFeatures() {
    updateCartCount();
    initMenuButtons();
    renderAdminOrders();
  }

  function watchMenuCards() {
    const menuPage = document.querySelector(".menu-page");
    if (!menuPage || menuPage.dataset.cartObserverReady === "true") return;
    menuPage.dataset.cartObserverReady = "true";
    const observer = new MutationObserver(() => initMenuButtons());
    observer.observe(menuPage, { childList: true, subtree: true });
  }

  function watchAdminOrders() {
    if (!document.getElementById("admin-orders-list")) return;
    document.querySelectorAll("[data-admin-tab], [data-admin-open]").forEach((button) => {
      button.addEventListener("click", () => setTimeout(renderAdminOrders, 50));
    });
    window.addEventListener("storage", (event) => {
      if (event.key === ORDERS_KEY) renderAdminOrders();
    });
    window.addEventListener("sithinem:orders-updated", renderAdminOrders);
    setInterval(renderAdminOrders, 2000);
  }

  function init() {
    injectStyles();
    refreshCartFeatures();
    initCartPage();
    watchMenuCards();
    watchAdminOrders();
  }

  function scheduleInit() {
    init();
    [100, 400, 1000].forEach((delay) => setTimeout(refreshCartFeatures, delay));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleInit);
  else scheduleInit();
  window.addEventListener("load", refreshCartFeatures);
})();
