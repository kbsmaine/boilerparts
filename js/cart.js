/* ===== Modal Cart (FULL) =====
   - LocalStorage key: "cart"
   - Dispatches:
       • cart:open      (once, when modal opens)
       • cart:update    (after UI refreshes while modal is open)
   - Prevents duplicate cart:update on first open to avoid double PayPal renders
*/

(function () {
  console.log("✅ Modal Cart Loaded");

  const STORAGE_KEY = "cart";
  const modalId = "cartModal";
  const modalInnerId = "cartInner";
  const mountId = "paypal-mount"; // PayPal will render *inside* this
  const cartCountEl = document.getElementById("cartCount");
  const openCartBtn = document.getElementById("openCartBtn");

  // ---------- Cart helpers ----------
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }
  function writeCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadge();
  }
  function cartTotal(items = readCart()) {
    return items.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty || 1)), 0);
  }
  function updateBadge() {
    const items = readCart();
    const count = items.reduce((n, it) => n + (Number(it.qty) || 1), 0);
    if (cartCountEl) {
      cartCountEl.textContent = count;
    }
  }

  // ---------- Modal skeleton ----------
  function ensureModal() {
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.style.cssText = `
        position: fixed; inset: 0; display:none; z-index: 1000;
        align-items: center; justify-content: center; background: rgba(2,6,23,.6);
      `;
      modal.innerHTML = `
        <div id="${modalInnerId}" style="
          width:min(680px, 92vw); background:rgba(30,41,59,.96); color:#fff;
          border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,.45); padding:24px; position:relative;">
          <button aria-label="Close" id="cartCloseBtn" style="
            position:absolute; right:14px; top:10px; font-size:20px; background:none; border:none; color:#fff; cursor:pointer;">✕</button>
          <h2 style="font-weight:800; font-size:28px; margin:0 0 14px;">Your Cart</h2>
          <div id="cartList" style="display:grid; gap:10px; margin-bottom:12px;"></div>
          <div id="cartTotalRow" style="font-weight:800; text-align:center; margin:10px 0 18px;">
            Total: $0.00
          </div>

          <!-- PayPal mount goes here (single source of truth) -->
          <div id="${mountId}" style="display:grid; gap:10px;"></div>
        </div>
      `;
      document.body.appendChild(modal);

      // Close handlers
      modal.addEventListener("click", (e) => {
        if (e.target.id === modalId) closeModal();
      });
      modal.querySelector("#cartCloseBtn").addEventListener("click", closeModal);
    }
    return modal;
  }

  function openModal() {
    const modal = ensureModal();
    renderCart(); // populate before showing
    modal.style.display = "flex";

    // Fire a single open event
    document.dispatchEvent(new CustomEvent("cart:open", { detail: { opened: true } }));

    // Immediately send one update (now that it's visible)
    const total = cartTotal();
    document.dispatchEvent(new CustomEvent("cart:update", { detail: { total } }));
  }

  function closeModal() {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
  }

  // ---------- Render cart items ----------
  function renderCart() {
    const items = readCart();
    const listEl = document.getElementById("cartList");
    const totalEl = document.getElementById("cartTotalRow");
    const ppMount = document.getElementById(mountId);

    if (!listEl || !totalEl || !ppMount) return;

    listEl.innerHTML = "";
    if (items.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;opacity:.85;">Your cart is empty.</div>`;
    } else {
      items.forEach((it, idx) => {
        const row = document.createElement("div");
        row.style.cssText = `
          display:grid; grid-template-columns: 1fr auto auto auto; gap:8px; align-items:center;
          background:rgba(148,163,184,.12); border-radius:12px; padding:12px 14px;`;
        row.innerHTML = `
          <div>
            <div style="font-weight:600">${it.name}</div>
            <div style="opacity:.8">$${Number(it.price).toFixed(2)}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="qty-dec" data-i="${idx}" style="width:28px;height:28px;">−</button>
            <span style="min-width:18px; text-align:center;">${it.qty || 1}</span>
            <button class="qty-inc" data-i="${idx}" style="width:28px;height:28px;">+</button>
          </div>
          <button class="rm" data-i="${idx}" aria-label="Remove" style="width:28px;height:28px;">✕</button>
        `;
        listEl.appendChild(row);
      });
    }

    totalEl.textContent = `Total: $${cartTotal(items).toFixed(2)}`;

    // Bind qty/remove
    listEl.querySelectorAll(".qty-dec").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        const arr = readCart();
        arr[i].qty = Math.max(1, (Number(arr[i].qty) || 1) - 1);
        writeCart(arr);
        renderCart();
        if (isModalVisible()) {
          document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(arr) } }));
        }
      });
    });
    listEl.querySelectorAll(".qty-inc").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        const arr = readCart();
        arr[i].qty = (Number(arr[i].qty) || 1) + 1;
        writeCart(arr);
        renderCart();
        if (isModalVisible()) {
          document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(arr) } }));
        }
      });
    });
    listEl.querySelectorAll(".rm").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        const arr = readCart();
        arr.splice(i, 1);
        writeCart(arr);
        renderCart();
        if (isModalVisible()) {
          document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(arr) } }));
        }
      });
    });

    // Make sure PayPal mount exists & is empty (payments.js owns the rendering)
    ppMount.innerHTML = "";
  }

  function isModalVisible() {
    const modal = document.getElementById(modalId);
    return modal && modal.style.display === "flex";
  }

  // ---------- Add-to-cart buttons ----------
  document.querySelectorAll(".btn.add").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name || "Item";
      const price = Number(btn.dataset.price || 0);
      if (!id) return;

      const arr = readCart();
      const found = arr.find(i => i.id === id);
      if (found) found.qty = (Number(found.qty) || 1) + 1;
      else arr.push({ id, name, price, qty: 1 });

      writeCart(arr);

      // lil UX pulse
      btn.classList.add("added");
      const countEl = document.getElementById("cartCount");
      if (countEl) {
        countEl.classList.add("pulse");
        setTimeout(() => countEl.classList.remove("pulse"), 400);
      }
      setTimeout(() => btn.classList.remove("added"), 450);
    });
  });

  // ---------- Open cart button ----------
  if (openCartBtn) {
    openCartBtn.addEventListener("click", openModal);
  }

  // Initial badge
  updateBadge();

  // Expose minimal API (optional)
  window.__cart = {
    open: openModal,
    total: () => cartTotal(),
    items: () => readCart(),
    clear: () => { writeCart([]); renderCart(); }
  };
})();
