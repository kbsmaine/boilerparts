// js/cart.js
console.log("✅ Modal Cart Loaded");

// ----- storage helpers -----
const CART_KEY = "greysons_cart";
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount(cart) { return cart.reduce((n, it) => n + (Number(it.qty)||1), 0); }
function cartTotal(cart) {
  return Number(cart.reduce((s, it) => s + (Number(it.price)||0) * (Number(it.qty)||1), 0).toFixed(2));
}

// expose total for payments.js (will be updated on render)
window.Cart = window.Cart || {};
window.Cart.total = () => cartTotal(loadCart());

// ----- DOM refs -----
const cartBtn = document.getElementById("openCartBtn");
const countBadge = document.getElementById("cartCount");

// Create modal container once
let modal, modalContent, listEl, totalEl, paypalWrap, unavailableEl;
function ensureModal() {
  if (modal) return;
  modal = document.createElement("div");
  modal.id = "cartModal";
  modal.innerHTML = `
    <div class="cart-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.5);"></div>
    <div class="cart-panel" role="dialog" aria-modal="true"
         style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:680px;width:90%;background:#1f2937;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);">
      <div style="padding:22px 22px 8px;color:#fff;font-weight:800;font-size:24px;display:flex;justify-content:space-between;align-items:center">
        <span>Your Cart</span>
        <button id="cartClose" aria-label="Close" style="background:transparent;border:0;color:#cbd5e1;font-size:22px;cursor:pointer">✕</button>
      </div>
      <div id="cartBody" style="padding:8px 22px 22px;">
        <div id="cartItems"></div>
        <div style="margin-top:12px;color:#e2e8f0;font-weight:700">Total: $<span id="cartTotalAmount">0.00</span></div>
        <div style="margin-top:16px">
          <!-- where PayPal renders INSIDE the modal -->
          <div id="paypal-buttons"></div>
          <div id="paypalUnavailable" class="muted" style="margin-top:10px;color:#cbd5e1">PayPal unavailable</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modalContent   = modal.querySelector(".cart-panel");
  listEl         = modal.querySelector("#cartItems");
  totalEl        = modal.querySelector("#cartTotalAmount");
  paypalWrap     = modal.querySelector("#paypal-buttons");
  unavailableEl  = modal.querySelector("#paypalUnavailable");

  modal.querySelector("#cartClose").addEventListener("click", closeCart);
  modal.querySelector(".cart-backdrop").addEventListener("click", closeCart);
  modal.style.display = "none";
}

// ----- render & open/close -----
function renderCart() {
  ensureModal();
  const cart = loadCart();

  // count badge
  if (countBadge) countBadge.textContent = String(cartCount(cart));

  // list
  listEl.innerHTML = "";
  if (!cart.length) {
    listEl.innerHTML = `<p class="muted" style="color:#cbd5e1">Your cart is empty.</p>`;
  } else {
    cart.forEach((it, idx) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.dataset.price = String(it.price);
      row.style.cssText = "display:flex;align-items:center;justify-content:space-between;background:#111827;border-radius:10px;padding:12px 14px;margin:8px 0;color:#e5e7eb";
      row.innerHTML = `
        <div>
          <div style="font-weight:700">${it.name}</div>
          <div style="font-size:14px;color:#94a3b8">$${Number(it.price).toFixed(2)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="qty-minus" aria-label="Decrease" style="width:32px;height:32px;border:0;border-radius:8px;background:#0f172a;color:#e5e7eb;cursor:pointer">−</button>
          <span class="qty" data-qty style="min-width:20px;text-align:center">${it.qty||1}</span>
          <button class="qty-plus" aria-label="Increase" style="width:32px;height:32px;border:0;border-radius:8px;background:#0f172a;color:#e5e7eb;cursor:pointer">+</button>
          <button class="remove" aria-label="Remove" style="margin-left:6px;background:#7f1d1d;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">✕</button>
        </div>
      `;
      // events
      row.querySelector(".qty-minus").addEventListener("click", () => { changeQty(idx, -1); });
      row.querySelector(".qty-plus").addEventListener("click", () => { changeQty(idx, +1); });
      row.querySelector(".remove").addEventListener("click", () => { removeItem(idx); });
      listEl.appendChild(row);
    });
  }

  // totals & exposure for payments.js
  const total = cartTotal(cart);
  totalEl.textContent = total.toFixed(2);
  window.Cart.total = () => total;

  // show/hide “PayPal unavailable”
  if (unavailableEl) unavailableEl.style.display = total > 0 ? "none" : "block";

  // let payments.js know totals changed (it will render buttons into #paypal-buttons)
  document.dispatchEvent(new CustomEvent("cart:update", { detail: { total } }));
}

function openCart() {
  ensureModal();
  renderCart();
  modal.style.display = "block";
  document.dispatchEvent(new CustomEvent("cart:open"));
}

function closeCart() {
  if (!modal) return;
  modal.style.display = "none";
  document.dispatchEvent(new CustomEvent("cart:close"));
}

// ----- item ops -----
function changeQty(index, delta) {
  const cart = loadCart();
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, (Number(cart[index].qty)||1) + delta);
  saveCart(cart);
  renderCart();
}

function removeItem(index) {
  const cart = loadCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function addToCart(item) {
  const cart = loadCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) existing.qty = (Number(existing.qty)||1) + 1;
  else cart.push({ id: item.id, name: item.name, price: Number(item.price), qty: 1 });
  saveCart(cart);
  // badge + micro-feedback
  if (countBadge) {
    countBadge.textContent = String(cartCount(cart));
    countBadge.classList.add("pulse");
    setTimeout(() => countBadge.classList.remove("pulse"), 350);
  }
  document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(cart) } }));
}

// ----- wire buttons -----
document.addEventListener("DOMContentLoaded", () => {
  // “Add to Cart” buttons (expects .btn.add with data-id|data-name|data-price)
  document.querySelectorAll(".btn.add").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = {
        id: btn.dataset.id,
        name: btn.dataset.name || btn.closest(".product")?.querySelector("h3")?.textContent || "Item",
        price: btn.dataset.price || btn.closest(".product")?.querySelector(".price")?.textContent
      };
      item.price = String(item.price).replace(/[^0-9.]/g, "");
      addToCart(item);
      // quick visual state
      btn.classList.add("added");
      setTimeout(() => btn.classList.remove("added"), 400);
    });
  });

  // cart open button
  if (cartBtn) cartBtn.addEventListener("click", openCart);

  // initial badge
  if (countBadge) countBadge.textContent = String(cartCount(loadCart()));
});
