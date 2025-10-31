// js/payments.js  — bullet-proof PayPal init for every page/modal
console.log("💳 payments.js loaded");

(function () {
  const CLIENT_ID = "AR1KqgMjoynz7pTqK0twhdeGadhGvtmbNXOhbGeqxil-d_tblaF-xCtrY_1UXmmECd3FDKE6sv6woYQV";
  const SDK_QS =
    `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&components=buttons,funding-eligibility&enable-funding=card,paylater&currency=USD`;

  // ---- utilities -----------------------------------------------------------
  function getSDK() {
    // Support both default and custom namespace
    return (window.paypal && window.paypal.Buttons ? window.paypal :
           (window.paypal_sdk && window.paypal_sdk.Buttons ? window.paypal_sdk : null));
  }

  function findSDKTag() {
    const tags = Array.from(document.querySelectorAll('script[src*="paypal.com/sdk/js"]'));
    return tags.length ? tags[0] : null;
  }

  function ensureSDKReady(cb, tries = 0) {
    const sdk = getSDK();
    if (sdk) return cb(sdk);
    if (tries > 40) { // ~12s max
      console.error("❌ PayPal SDK never became ready.");
      return;
    }
    setTimeout(() => ensureSDKReady(cb, tries + 1), 300);
  }

  function injectSDKIfMissing() {
    if (getSDK()) return;                 // already present
    if (findSDKTag()) return;             // tag exists; let onload path handle timing
    const s = document.createElement("script");
    s.src = SDK_QS;
    s.onload = () => console.log("✅ PayPal SDK injected & loaded");
    s.onerror = () => console.error("❌ Failed to inject PayPal SDK");
    document.body.appendChild(s);
  }

  // ---- rendering -----------------------------------------------------------
  function getCartTotalSafe() {
    try {
      return typeof getCartTotal === "function" ? Number(getCartTotal()) || 0 : 0;
    } catch { return 0; }
  }

  function renderButtons(sdk) {
    const mount = document.getElementById("paypal-container");
    if (!mount) {
      // Some pages might not have the container; that’s fine.
      return;
    }
    // Clear previous render if reopening modal
    mount.innerHTML = "";

    try {
      sdk.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
        createOrder: (data, actions) => {
          const total = getCartTotalSafe().toFixed(2);
          if (total === "0.00") {
            console.warn("ℹ️ Cart total is 0. Buttons will render but cannot create order.");
          }
          return actions.order.create({
            purchase_units: [{ amount: { value: total } }]
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then((details) => {
            alert(`Transaction completed by ${details.payer.name.given_name}!`);
            if (typeof clearCart === "function") clearCart();
          });
        },
        onError: (err) => console.error("PayPal error:", err)
      }).render(mount);
      console.log("✅ PayPal Buttons rendered");
    } catch (e) {
      console.error("❌ Failed to render PayPal Buttons:", e);
    }
  }

  // ---- wire-up: run on load, and every time the cart opens -----------------
  function initPayPalFlow() {
    // Make sure SDK script exists; if not, add it.
    injectSDKIfMissing();

    // Wait until SDK is actually ready, then render
    ensureSDKReady(renderButtons);
  }

  // Run after DOM is ready
  document.addEventListener("DOMContentLoaded", initPayPalFlow);

  // Re-render whenever the cart modal is opened (cart.js should open modal on this button)
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("#openCartBtn");
    if (openBtn) {
      // Give the modal a tick to mount DOM, then render/refresh buttons
      setTimeout(() => ensureSDKReady(renderButtons), 150);
    }
  });

  // Optional: if your cart.js dispatches a custom event after updating totals,
  // we’ll refresh buttons so PayPal amount is correct.
  document.addEventListener("cart:updated", () => {
    const sdk = getSDK();
    if (sdk) renderButtons(sdk);
  });
})();
