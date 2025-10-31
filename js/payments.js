/* payments.js — render PayPal ONLY inside the cart modal */
console.log("💳 payments.js loaded");

const PP = (window.paypal_sdk || window.paypal);
const BUTTONS_TARGET = "#paypal-buttons";      // <div id="paypal-buttons"></div> lives INSIDE the modal content
const CART_OPEN_EVENT = "cart:open";           // cart.js should dispatch this when the modal opens
const CART_CLOSE_EVENT = "cart:close";         // cart.js should dispatch this when the modal closes

let ppButtons = null;

/* Robust total getter:
   - prefer a global from cart.js (window.getCartTotal)
   - else fall back to localStorage 'cart' [{price, qty}]
*/
function getCartTotal() {
  if (typeof window.getCartTotal === "function") {
    return Number(window.getCartTotal() || 0);
  }
  try {
    const raw = localStorage.getItem("cart");
    if (!raw) return 0;
    const items = JSON.parse(raw);
    return items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty || 1), 0);
  } catch {
    return 0;
  }
}

/* Ensure a stable container exists inside the modal */
function getButtonsContainer() {
  return document.querySelector(BUTTONS_TARGET);
}

/* Render buttons (idempotent) */
function renderButtonsIfNeeded() {
  const container = getButtonsContainer();
  if (!PP || !container) return;

  // If already rendered into this container, don't duplicate
  if (ppButtons && container.contains(container.querySelector("iframe"))) {
    return;
  }

  // Clean any previous instance
  if (ppButtons && ppButtons.close) {
    try { ppButtons.close(); } catch {}
    ppButtons = null;
  }
  container.innerHTML = ""; // clear any stale markup

  ppButtons = PP.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },

    createOrder: function (data, actions) {
      const total = Number(getCartTotal().toFixed(2));
      if (total <= 0) {
        console.info("ℹ️ Cart total is 0. Buttons will render but cannot create order.");
        // Prevent the SDK 422 by throwing and letting onError handle toast/UI
        throw new Error("Cart total is $0.00 — add items before checkout.");
      }
      return actions.order.create({
        purchase_units: [{
          amount: { value: total.toFixed(2), currency_code: "USD" },
          description: "Greyson’s Used Boiler Parts & Surplus"
        }]
      });
    },

    onApprove: function (data, actions) {
      return actions.order.capture().then(function (details) {
        console.log("✅ Payment captured", details);
        // You can clear the cart here via a function from cart.js if available:
        if (typeof window.clearCart === "function") window.clearCart();
        alert("Payment successful. Thank you!");
      });
    },

    onError: function (err) {
      console.error("PayPal error:", err);
      alert((err && err.message) ? err.message : "PayPal error. Please try again.");
    }
  });

  ppButtons.render(container).then(()=>{
    console.log("✅ PayPal Buttons rendered");
  });
}

/* Destroy buttons when modal closes (prevents “container removed from DOM”) */
function destroyButtons() {
  const container = getButtonsContainer();
  if (ppButtons && ppButtons.close) {
    try { ppButtons.close(); } catch {}
    ppButtons = null;
  }
  if (container) container.innerHTML = "";
}

/* Wire up to modal lifecycle */
document.addEventListener(CART_OPEN_EVENT, renderButtonsIfNeeded);
document.addEventListener(CART_CLOSE_EVENT, destroyButtons);

/* Fallbacks: clicking the cart button should also render */
document.getElementById("openCartBtn")?.addEventListener("click", ()=>{
  // slight delay so the modal DOM exists
  setTimeout(renderButtonsIfNeeded, 50);
});

/* If the modal is already open when the page loads, try once */
window.addEventListener("load", ()=>{
  setTimeout(renderButtonsIfNeeded, 150);
});
