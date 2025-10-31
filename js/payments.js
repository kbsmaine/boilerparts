/* payments.js — render PayPal ONLY inside the cart modal */
console.log("💳 payments.js loaded");

const PP = (window.paypal_sdk || window.paypal);
const BUTTONS_TARGET = "#paypal-buttons";   // lives inside the cart modal
const CART_OPEN_EVENT = "cart:open";        // cart.js should dispatch when modal opens
const CART_CLOSE_EVENT = "cart:close";      // cart.js should dispatch when modal closes

let ppButtons = null;

/* Safe cart total reader that avoids name collisions and supports several shapes */
function readCartTotal() {
  try {
    // Prefer a cart API if present
    if (window.Cart && typeof window.Cart.total === "function") {
      return Number(window.Cart.total() || 0);
    }
    if (typeof window.cartTotal === "function") {
      return Number(window.cartTotal() || 0);
    }
    // If a global getCartTotal exists and it's NOT this function, use it
    if (typeof window.getCartTotal === "function" && window.getCartTotal !== readCartTotal) {
      return Number(window.getCartTotal() || 0);
    }
    // Fallbacks: localStorage structures
    const candidates = ["cart", "cartItems"];
    for (const key of candidates) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data.reduce(
          (sum, it) => sum + Number(it.price || 0) * Number(it.qty || it.quantity || 1),
          0
        );
      }
      if (data && typeof data.total === "number") return Number(data.total);
    }
  } catch (_) { /* ignore */ }
  return 0;
}

function buttonsContainer() {
  return document.querySelector(BUTTONS_TARGET);
}

/* Render buttons (idempotent, retries briefly until the modal content exists) */
function renderButtonsIfNeeded(attempt = 0) {
  const container = buttonsContainer();
  if (!PP) return;                         // SDK not loaded yet
  if (!container) {
    if (attempt < 10) setTimeout(() => renderButtonsIfNeeded(attempt + 1), 50);
    return;
  }

  // Prevent duplicates
  if (ppButtons && container.querySelector("iframe")) return;

  // Clean any previous instance
  if (ppButtons && ppButtons.close) {
    try { ppButtons.close(); } catch {}
    ppButtons = null;
  }
  container.innerHTML = "";

  ppButtons = PP.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },

    createOrder: (data, actions) => {
      const total = Number(readCartTotal().toFixed(2));
      if (total <= 0) {
        // Stop 422s cleanly
        throw new Error("Cart total is $0.00 — add items before checkout.");
      }
      return actions.order.create({
        purchase_units: [{
          amount: { value: total.toFixed(2), currency_code: "USD" },
          description: "Greyson’s Used Boiler Parts & Surplus"
        }]
      });
    },

    onApprove: (data, actions) =>
      actions.order.capture().then(details => {
        console.log("✅ Payment captured", details);
        if (typeof window.clearCart === "function") window.clearCart();
        alert("Payment successful. Thank you!");
      }),

    onError: (err) => {
      console.error("PayPal error:", err);
      alert(err?.message || "PayPal error. Please try again.");
    }
  });

  ppButtons.render(container).then(() => {
    console.log("✅ PayPal Buttons rendered");
  });
}

/* Destroy buttons when the modal closes */
function destroyButtons() {
  const container = buttonsContainer();
  if (ppButtons && ppButtons.close) {
    try { ppButtons.close(); } catch {}
    ppButtons = null;
  }
  if (container) container.innerHTML = "";
}

/* Hook into modal lifecycle */
document.addEventListener(CART_OPEN_EVENT, () => renderButtonsIfNeeded());
document.addEventListener(CART_CLOSE_EVENT, destroyButtons);

/* Also render after clicking the cart icon (in case cart.js doesn't dispatch) */
document.getElementById("openCartBtn")?.addEventListener("click", () => {
  setTimeout(() => renderButtonsIfNeeded(), 50);
});

/* If the modal is already open at load for any reason, try once */
window.addEventListener("load", () => setTimeout(() => renderButtonsIfNeeded(), 150));

/* Optional: expose a manual trigger cart.js can call after it builds the modal DOM */
window.paymentsRenderInModal = () => renderButtonsIfNeeded();
