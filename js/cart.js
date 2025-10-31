/* ===== Modal Cart (FULL) =====
   - LocalStorage key: "cart"
   - Emits:
       • cart:open   (when modal opens)
       • cart:update (after any change while modal is open)
*/

(function () {
  console.log("✅ Modal Cart Loaded");

  const STORAGE_KEY = "cart";
  const MODAL_ID = "cartModal";
  const INNER_ID = "cartInner";
  const MOUNT_ID = "paypal-mount";
  const cartCountEl = document.getElementById("cartCount");
  const openCartBtn = document.getElementById("openCartBtn");

  // ---------- storage ----------
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  };
  const writeCart = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadge();
  };
  const cartTotal = (items = readCart()) =>
    items.reduce((s, it) => s + Number(it.price) * (Number(it.qty) || 1), 0);
  const updateBadge = () => {
    const n = readCart().reduce((a, it) => a + (Number(it.qty) || 1), 0);
    if (cartCountEl) cartCountEl.textContent = n;
  };

  // ---------- modal ----------
  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.style.cssText = `
        position:fixed; inset:0; display:none; z-index:1000;
        align-items:center; justify-content:center; background:rgba(2,6,23,.6);`;
      modal.innerHTML = `
        <div id="${INNER_ID}" style="
            width:min(680px,92vw); background:rgba(30,41,59,.96); color:#fff;
            border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,.45);
            padding:24px; position:relative;">
          <button id="cartCloseBtn" aria-label="Close" style="
            position:absolute; right:14px; top:10px; font-size:20px; background:none; border:none; color:#fff; cursor:pointer;">✕</button>
          <h2 style="font-weight:800; font-size:28px; margin:0 0 14px;">Your Cart</h2>
          <div id="cartList" style="display:grid; gap:10px; margin-bottom:12px;"></div>
          <div id="cartTotalRow" style="font-weight:800; text-align:center; margin:10px 0 18px;">Total: $0.00</div>
          <div id="${MOUNT_ID}" style="display:grid; gap:10px;"></div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => { if (e.target.id === MODAL_ID) closeModal(); });
      modal.querySelector("#cartCloseBtn").addEventListener("click", closeModal);
    }
    return modal;
  }

  function openModal() {
    ensureModal();
    renderCart();
    document.getElementById(MODAL_ID).style.display = "flex";
    document.dispatchEvent(new CustomEvent("cart:open"));
    document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal() } }));
  }
  function closeModal() {
    const m = document.getElementById(MODAL_ID);
    if (m) m.style.display = "none";
  }
  const modalOpen = () => {
    const m = document.getElementById(MODAL_ID);
    return !!(m && m.style.display === "flex");
  };

  // ---------- render ----------
  function renderCart() {
    const items = readCart();
    const list = document.getElementById("cartList");
    const totalEl = document.getElementById("cartTotalRow");
    const mount = document.getElementById(MOUNT_ID);
    if (!list || !totalEl || !mount) return;

    list.innerHTML = "";
    if (items.length === 0) {
      list.innerHTML = `<div style="text-align:center;opacity:.85;">Your cart is empty.</div>`;
    } else {
      items.forEach((it, i) => {
        const row = document.createElement("div");
        row.style.cssText = `
          display:grid; grid-template-columns: 1fr auto auto; gap:10px; align-items:center;
          background:rgba(148,163,184,.12); border-radius:12px; padding:12px 14px;`;

        // OLD +/- controls
        const controls = `
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="qty-btn minus" data-i="${i}" style="width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.4);color:#fff;font-weight:800;">−</button>
            <span style="min-width:18px;text-align:center;font-weight:700;">${it.qty || 1}</span>
            <button class="qty-btn plus"  data-i="${i}" style="width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.4);color:#fff;font-weight:800;">+</button>
          </div>`;

        row.innerHTML = `
          <div>
            <div style="font-weight:600">${it.name}</div>
            <div style="opacity:.8">$${Number(it.price).toFixed(2)}</div>
          </div>
          ${controls}
          <button class="rm" data-i="${i}" aria-label="Remove" style="width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.4);color:#fff;">✕</button>
        `;
        list.appendChild(row);
      });
    }

    totalEl.textContent = `Total: $${cartTotal(items).toFixed(2)}`;

    // Bind
    list.querySelectorAll(".qty-btn.minus").forEach(b => {
      b.addEventListener("click", () => {
        const i = Number(b.dataset.i);
        const arr = readCart();
        arr[i].qty = Math.max(1, (Number(arr[i].qty) || 1) - 1);
        writeCart(arr); renderCart();
        if (modalOpen()) document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(arr) } }));
      });
    });
    list.querySelectorAll(".qty-btn.plus").forEach(b => {
      b.addEventListener("click", () => {
        const i = Number(b.dataset.i);
        const arr = readCart();
        arr[i].qty = (Number(arr[i].qty) || 1) + 1;
        writeCart(arr); renderCart();
        if (modalOpen()) document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(arr) } }));
      });
    });
    list.querySelectorAll(".rm").forEach(b => {
      b.addEventListener("click", () => {
        const i = Number(b.dataset.i);
        const arr = readCart(); arr.splice(i, 1);
        writeCart(arr); renderCart();
        if (modalOpen()) document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: cartTotal(arr) } }));
      });
    });

    // Clear the PayPal mount; payments.js owns rendering
    mount.innerHTML = "";
  }

  // ---------- add-to-cart ----------
  document.querySelectorAll(".btn.add").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (!id) return;
      const name = btn.dataset.name || "Item";
      const price = Number(btn.dataset.price || 0);
      const arr = readCart();
      const f = arr.find(x => x.id === id);
      if (f) f.qty = (Number(f.qty) || 1) + 1;
      else arr.push({ id, name, price, qty: 1 });
      writeCart(arr);
      // lil pulse on badge if present
      const cc = document.getElementById("cartCount");
      if (cc) { cc.classList.add("pulse"); setTimeout(() => cc.classList.remove("pulse"), 400); }
    });
  });

  if (openCartBtn) openCartBtn.addEventListener("click", openModal);
  updateBadge();

  // Expose mini API if needed
  window.__cart = {
    open: openModal,
    total: () => cartTotal(),
    items: () => readCart(),
    clear: () => { localStorage.setItem(STORAGE_KEY, "[]"); updateBadge(); }
  };
})();
