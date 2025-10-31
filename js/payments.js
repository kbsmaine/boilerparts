/* ===== PayPal Buttons (FULL) =====
   Renders inside #paypal-mount ONLY when the cart modal is visible.
   - De-dupes multiple renders
   - Prevents zero-total orders
   - Works on both index.html and inventory.html
   Requires PayPal SDK loaded with data-namespace="paypal_sdk"
*/

(function () {
  console.log("💳 payments.js loaded");

  const MOUNT_ID = "paypal-mount";
  const MODAL_ID = "cartModal";

  // Guard flags to avoid duplicates
  let renderedOnce = false;
  let lastRenderAt = 0;

  // Simple helpers
  function modalOpen() {
    const modal = document.getElementById(MODAL_ID);
    return !!(modal && modal.style.display === "flex");
  }
  function mountEl() {
    return document.getElementById(MOUNT_ID);
  }
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("cart")) || [];
    } catch (_) {
      return [];
    }
  }
  function getCartTotal() {
    const items = getCart();
    return items.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty || 1)), 0);
  }

  // Clean any previous render
  function clearMount() {
    const m = mountEl();
    if (m) m.innerHTML = "";
  }

  // Create individual containers so PayPal can render its three buttons
  function ensureButtonContainers() {
    const m = mountEl();
    if (!m) return null;

    // Fresh containers on each render attempt
    m.innerHTML = `
      <div id="pp-btn-paypal"></div>
      <div id="pp-btn-later" style="margin-top:10px;"></div>
      <div id="pp-btn-card"  style="margin-top:10px;"></div>
    `;
    return {
      paypal: document.getElementById("pp-btn-paypal"),
      later:  document.getElementById("pp-btn-later"),
      card:   document.getElementById("pp-btn-card"),
    };
  }

  function renderButtons() {
    // Debounce: don’t render more than once within 150ms
    const now = Date.now();
    if (now - lastRenderAt < 150) return;
    lastRenderAt = now;

    // Must be inside visible modal
    if (!modalOpen()) return;

    const total = Number(getCartTotal().toFixed(2));
    const m = mountEl();
    if (!m) return;

    // Always reset containers before trying to render
    const containers = ensureButtonContainers();
    if (!containers) return;

    // If no SDK yet, try again shortly
    if (!window.paypal_sdk || !window.paypal_sdk.Buttons) {
      setTimeout(renderButtons, 120);
      return;
    }

    // If total <= 0, show disabled state (no order creation)
    if (total <= 0) {
      clearMount();
      const d = document.createElement("div");
      d.style.cssText = "text-align:center; opacity:.9; font-weight:700;";
      d.textContent = "PayPal unavailable";
      m.appendChild(d);
      renderedOnce = true;
      return;
    }

    // Shared button config
    const cfg = {
      style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", tagline: false },
      createOrder: function (data, actions) {
        // Build a very basic order with one line item = cart total
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: total.toFixed(2),
              currency_code: "USD"
            },
            description: "Greyson’s Used Boiler Parts & Surplus – Web Order"
          }]
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          alert("Payment completed by " + (details.payer?.name?.given_name || "customer") + " 👌");
          // Clear cart on success
          localStorage.setItem("cart", "[]");
          // Ask cart.js to refresh itself
          document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: 0 } }));
        });
      },
      onError: function (err) {
        console.error("PayPal error:", err);
        alert("PayPal error. Please try again.");
      }
    };

    // Render three funding sources in separate mounts
    try {
      window.paypal_sdk.Buttons({ ...cfg, fundingSource: window.paypal_sdk.FUNDING.PAYPAL }).render("#pp-btn-paypal");
      window.paypal_sdk.Buttons({ ...cfg, fundingSource: window.paypal_sdk.FUNDING.PAYLATER }).render("#pp-btn-later");
      window.paypal_sdk.Buttons({ ...cfg, fundingSource: window.paypal_sdk.FUNDING.CARD }).render("#pp-btn-card");
      renderedOnce = true;
      console.log("✅ PayPal Buttons rendered");
    } catch (e) {
      console.error("Failed to render PayPal buttons:", e);
      clearMount();
      const d = document.createElement("div");
      d.style.cssText = "text-align:center; opacity:.9; font-weight:700;";
      d.textContent = "PayPal unavailable";
      m.appendChild(d);
    }
  }

  // Listen for cart lifecycle
  document.addEventListener("cart:open", () => {
    renderedOnce = false; // allow a fresh render when opening
    clearMount();
    renderButtons();
  });
  document.addEventListener("cart:update", () => {
    // Re-render only if already rendered once AND modal still open
    if (modalOpen()) renderButtons();
  });

  // If someone loads the page with modal already open (rare), try once
  if (modalOpen()) renderButtons();
})();
