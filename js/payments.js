// js/payments.js
console.log("💳 payments.js loaded");

(function () {
  if (window.__paymentsBound) return;   // prevent double listeners
  window.__paymentsBound = true;

  const NS = window.paypal_sdk || window.paypal; // namespace from SDK
  const BTN_CONTAINER_ID = "paypal-buttons";
  const UNAVAILABLE_ID = "paypalUnavailable";

  let renderNonce = 0;

  function getCartTotal() {
    try {
      return typeof window.Cart?.total === "function" ? Number(window.Cart.total() || 0) : 0;
    } catch {
      return 0;
    }
  }

  function setUnavailable(show) {
    const el = document.getElementById(UNAVAILABLE_ID);
    if (el) el.style.display = show ? "block" : "none";
  }

  async function renderButtons(totalOverride) {
    const total = typeof totalOverride === "number" ? totalOverride : getCartTotal();
    const container = document.getElementById(BTN_CONTAINER_ID);
    if (!container) return;

    // cancel any in-flight renders
    const myNonce = ++renderNonce;

    // fresh container each time
    container.innerHTML = "";

    // no buttons if empty cart
    if (total <= 0) {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);

    // wait for SDK
    const paypalNs = await waitForSdk();
    if (myNonce !== renderNonce) return; // a newer render started

    paypalNs.Buttons({
      style: { layout: "vertical", color: "gold", label: "paypal", shape: "rect" },

      createOrder: function (data, actions) {
        const currentTotal = getCartTotal();
        if (currentTotal <= 0) {
          setUnavailable(true);
          throw new Error("Cart total is zero.");
        }
        return actions.order.create({
          purchase_units: [{
            amount: {
              currency_code: "USD",
              value: currentTotal.toFixed(2)
            }
          }]
        });
      },

      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          alert(`Thanks ${details.payer.name.given_name}! Order ${details.id} completed.`);
          // TODO: clear cart here if you want
        });
      },

      onError: function (err) {
        console.error("PayPal error:", err);
        alert("PayPal error. Please try again.");
      }
    }).render(`#${BTN_CONTAINER_ID}`).then(() => {
      if (myNonce !== renderNonce) {
        // another render replaced us — remove our DOM just in case
        container.innerHTML = "";
        return;
      }
      console.log("✅ PayPal Buttons rendered");
    });
  }

  function waitForSdk() {
    return new Promise((resolve) => {
      if (window.paypal_sdk || window.paypal) return resolve(window.paypal_sdk || window.paypal);
      const iv = setInterval(() => {
        if (window.paypal_sdk || window.paypal) {
          clearInterval(iv);
          resolve(window.paypal_sdk || window.paypal);
        }
      }, 50);
    });
  }

  // React to cart lifecycle
  document.addEventListener("cart:open", () => renderButtons());
  document.addEventListener("cart:update", (e) => renderButtons(e?.detail?.total));

  // If the page starts with an already-open modal for some reason, try once.
  // (No-op if container isn't in DOM yet.)
  renderButtons();
})();
