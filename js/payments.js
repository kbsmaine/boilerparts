// js/payments.js
console.log("💳 payments.js loaded");

const SDK = () =>
  (window.paypal_sdk && window.paypal_sdk.Buttons ? window.paypal_sdk : null) ||
  (window.paypal && window.paypal.Buttons ? window.paypal : null);

let renderedInto = null; // track the last container we rendered into

function parseMoney(txt) {
  if (!txt) return 0;
  const n = String(txt).replace(/[^0-9.]/g, "");
  return Number(n || 0);
}

// --- Robust total detection (tries several sources) ---
function getCartTotal() {
  // 1) A Cart API (preferred if your cart.js exposes it)
  try {
    if (window.Cart && typeof window.Cart.total === "function") {
      const t = Number(window.Cart.total());
      if (!Number.isNaN(t) && t > 0) return t;
    }
  } catch {}

  // 2) Modal total text like: "Total: $395.00"
  const idSpan = document.querySelector("#cartTotalAmount, [data-cart-total]");
  if (idSpan) {
    const t = parseMoney(idSpan.textContent || idSpan.value);
    if (t > 0) return t;
  }

  // 3) Sum visible cart rows in modal: .cart-item[data-price] with .qty input/span
  const rows = document.querySelectorAll(".cart-item");
  if (rows.length) {
    let sum = 0;
    rows.forEach((row) => {
      const price = Number(row.dataset.price || row.getAttribute("data-price") || 0);
      const qtyEl = row.querySelector(".qty, [data-qty]");
      const qty =
        Number(qtyEl?.value || qtyEl?.textContent || qtyEl?.getAttribute?.("data-qty") || 1) || 1;
      sum += price * qty;
    });
    if (sum > 0) return sum;
  }

  // 4) localStorage (common keys)
  try {
    const keys = ["cart", "cartItems", "greysons_cart"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const sum = arr.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
        if (sum > 0) return sum;
      }
    }
  } catch {}

  return 0;
}

// Prefer modal container if present
function getPaypalContainer() {
  return (
    document.querySelector("#cartModal #paypal-buttons") ||
    document.querySelector("#paypal-buttons") ||
    document.querySelector("#paypal-container")
  );
}

// Show/Hide the “PayPal unavailable” line
function toggleUnavailable(total) {
  const msg = document.getElementById("paypalUnavailable");
  if (msg) msg.style.display = total > 0 ? "none" : "block";
}

// Cleanly teardown previously rendered buttons (if DOM moved/closed)
function teardownButtons() {
  if (renderedInto && renderedInto.firstChild && renderedInto.firstChild.remove) {
    try {
      renderedInto.firstChild.remove();
    } catch {}
  }
  renderedInto = null;
}

function renderButtonsIfNeeded() {
  const sdk = SDK();
  const container = getPaypalContainer();
  const total = Number(getCartTotal().toFixed(2));

  toggleUnavailable(total);

  if (!sdk || !container || total <= 0) {
    // Nothing to render or not eligible
    return;
  }

  // If we already rendered into this exact node, don’t double-render
  if (renderedInto === container && container.querySelector("iframe, .paypal-buttons")) return;

  // If rendering into a different container (e.g., modal reopened), teardown first
  if (renderedInto && renderedInto !== container) teardownButtons();

  sdk
    .Buttons({
      // Only create an order if total > 0
      createOrder: function (data, actions) {
        const liveTotal = Number(getCartTotal().toFixed(2));
        if (liveTotal <= 0) {
          console.info("ℹ️ Cart total is 0. Buttons will render but cannot create order.");
          return actions.reject();
        }
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: liveTotal.toFixed(2),
              },
            },
          ],
          application_context: {
            shipping_preference: "NO_SHIPPING",
          },
        });
      },

      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          alert(`Thanks, ${details.payer.name.given_name}! Your order is complete.`);
        });
      },

      onError: function (err) {
        console.error("PayPal error:", err);
      },

      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal",
      },
    })
    .render(container)
    .then(() => {
      renderedInto = container;
      console.log("✅ PayPal Buttons rendered");
    })
    .catch((e) => {
      console.error("Failed to render PayPal buttons", e);
      teardownButtons();
    });
}

// Public hook cart.js can call explicitly after it updates the modal
window.paymentsRenderInModal = renderButtonsIfNeeded;

// Re-render when the cart opens/updates/closes
document.addEventListener("cart:open", renderButtonsIfNeeded);
document.addEventListener("cart:update", renderButtonsIfNeeded);
document.addEventListener("cart:close", teardownButtons);

// Initial attempt (in case the modal is already open)
window.addEventListener("load", renderButtonsIfNeeded);
document.addEventListener("DOMContentLoaded", renderButtonsIfNeeded);
