/* ===== PayPal Buttons (modal-only) =====
   - Renders into #paypal-mount when cart modal is open
   - PAYPAL + PAYLATER use gold; CARD must use black
   - Safe against duplicate renders & partial failures
   - Requires SDK tag loaded with data-namespace="paypal_sdk"
*/

(function () {
  console.log("💳 payments.js loaded");

  const MODAL_ID = "cartModal";
  const MOUNT_ID = "paypal-mount";

  let lastRenderTs = 0;

  const modalOpen = () => {
    const m = document.getElementById(MODAL_ID);
    return !!(m && m.style.display === "flex");
  };
  const mount = () => document.getElementById(MOUNT_ID);
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem("cart")) || []; }
    catch { return []; }
  };
  const getTotal = () =>
    getCart().reduce((s, it) => s + Number(it.price) * (Number(it.qty) || 1), 0);

  const clearMount = () => { const m = mount(); if (m) m.innerHTML = ""; };

  function setupContainers() {
    const m = mount();
    if (!m) return null;
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
    if (!modalOpen()) return;

    // throttle a bit
    const now = Date.now();
    if (now - lastRenderTs < 120) return;
    lastRenderTs = now;

    const total = Number(getTotal().toFixed(2));
    const containers = setupContainers();
    if (!containers) return;

    if (!window.paypal_sdk || !window.paypal_sdk.Buttons) {
      // try again shortly until SDK is there
      setTimeout(renderButtons, 120);
      return;
    }

    if (total <= 0) {
      clearMount();
      const m = mount();
      if (m) {
        const d = document.createElement("div");
        d.style.cssText = "text-align:center; opacity:.9; font-weight:700;";
        d.textContent = "PayPal unavailable";
        m.appendChild(d);
      }
      return;
    }

    const baseCfg = {
      style: { layout: "vertical", shape: "rect", label: "paypal", tagline: false },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{
          amount: { value: total.toFixed(2), currency_code: "USD" },
          description: "Greyson’s Used Boiler Parts & Surplus – Web Order"
        }]
      }),
      onApprove: (data, actions) =>
        actions.order.capture().then(() => {
          // clear cart and notify cart.js to refresh UI/total
          localStorage.setItem("cart", "[]");
          document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: 0 } }));
          alert("Payment completed ✅");
        }),
      onError: (err) => {
        console.error("PayPal error:", err);
        alert("PayPal error. Please try again.");
      }
    };

    try {
      // PAYPAL (gold)
      window.paypal_sdk
        .Buttons({ ...baseCfg, style: { ...baseCfg.style, color: "gold" },
                   fundingSource: window.paypal_sdk.FUNDING.PAYPAL })
        .render("#pp-btn-paypal");
    } catch (e) {
      console.error("Failed to render PAYPAL button:", e);
    }

    try {
      // PAY LATER (gold)
      window.paypal_sdk
        .Buttons({ ...baseCfg, style: { ...baseCfg.style, color: "gold" },
                   fundingSource: window.paypal_sdk.FUNDING.PAYLATER })
        .render("#pp-btn-later");
    } catch (e) {
      // Some merchants/regions may not have Pay Later
      console.warn("Pay Later not available:", e);
      const el = document.getElementById("pp-btn-later");
      if (el) el.remove();
    }

    try {
      // CARD (must be black or white)
      window.paypal_sdk
        .Buttons({ ...baseCfg, style: { ...baseCfg.style, color: "black", label: "debit" },
                   fundingSource: window.paypal_sdk.FUNDING.CARD })
        .render("#pp-btn-card");
    } catch (e) {
      console.error("Failed to render CARD button:", e);
      const el = document.getElementById("pp-btn-card");
      if (el) el.remove();
    }

    console.log("✅ PayPal Buttons rendered");
  }

  // Events from cart.js
  document.addEventListener("cart:open", renderButtons);
  document.addEventListener("cart:update", renderButtons);

  // If modal is somehow open already
  if (modalOpen()) renderButtons();
})();
