/* Modal-only PayPal buttons — works on index & inventory
   Requires cart.js to create #cartModal and #paypal-mount.
   SDK tag must use data-namespace="paypal_sdk" and enable-funding=card,paylater.
*/
(function () {
  console.log("💳 payments.js loaded");

  const MODAL_ID  = "cartModal";
  const MOUNT_ID  = "paypal-mount";

  // Kill any old on-page mounts that conflict
  const legacy = document.getElementById("paypal-container");
  if (legacy) legacy.remove();

  // Helpers
  const modalEl   = () => document.getElementById(MODAL_ID);
  const mountEl   = () => document.getElementById(MOUNT_ID);
  const isOpen    = () => { const m = modalEl(); return !!(m && m.style.display === "flex"); };

  const getCart = () => {
    try { return JSON.parse(localStorage.getItem("cart")) || []; }
    catch { return []; }
  };
  const getTotal = () => getCart().reduce((s, it) => s + Number(it.price) * (Number(it.qty) || 1), 0);

  // De-dupe renders
  let lastSig = "";
  function signature() {
    const total = Number(getTotal().toFixed(2));
    return `${isOpen()}:${total}:${!!window.paypal_sdk}`;
  }

  function setupContainers() {
    const m = mountEl();
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
    // Don’t try if modal isn’t open yet
    if (!isOpen()) return;

    const sig = signature();
    if (sig === lastSig) return; // nothing changed
    lastSig = sig;

    const total = Number(getTotal().toFixed(2));
    const containers = setupContainers();
    if (!containers) return;

    // Wait for SDK if needed
    if (!window.paypal_sdk || !window.paypal_sdk.Buttons) {
      setTimeout(renderButtons, 120);
      return;
    }

    if (total <= 0) {
      const m = mountEl();
      if (m) m.innerHTML = `<div style="text-align:center;opacity:.9;font-weight:700;">PayPal unavailable</div>`;
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
          localStorage.setItem("cart", "[]");
          document.dispatchEvent(new CustomEvent("cart:update", { detail: { total: 0 } }));
          alert("Payment completed ✅");
        }),
      onError: (err) => {
        console.error("PayPal error:", err);
        alert("PayPal error. Please try again.");
      }
    };

    // Render (PayPal + Pay Later = gold; Card must be black)
    try {
      window.paypal_sdk.Buttons({
        ...baseCfg,
        style: { ...baseCfg.style, color: "gold" },
        fundingSource: window.paypal_sdk.FUNDING.PAYPAL
      }).render("#pp-btn-paypal");
    } catch (e) { console.error("PAYPAL button render failed:", e); }

    try {
      window.paypal_sdk.Buttons({
        ...baseCfg,
        style: { ...baseCfg.style, color: "gold" },
        fundingSource: window.paypal_sdk.FUNDING.PAYLATER
      }).render("#pp-btn-later");
    } catch (e) {
      // Not always available — remove slot cleanly
      const el = document.getElementById("pp-btn-later");
      if (el) el.remove();
      console.warn("Pay Later not available:", e);
    }

    try {
      window.paypal_sdk.Buttons({
        ...baseCfg,
        style: { ...baseCfg.style, color: "black", label: "debit" },
        fundingSource: window.paypal_sdk.FUNDING.CARD
      }).render("#pp-btn-card");
    } catch (e) {
      const el = document.getElementById("pp-btn-card");
      if (el) el.remove();
      console.error("CARD button render failed:", e);
    }

    console.log("✅ PayPal Buttons rendered");
  }

  // Fire on modal open + any cart change
  document.addEventListener("cart:open", renderButtons);
  document.addEventListener("cart:update", renderButtons);

  // Watch the modal’s display toggle (covers index page edge case)
  const mo = new MutationObserver(() => renderButtons());
  const attachObserver = () => { const m = modalEl(); if (m) mo.observe(m, { attributes: true, attributeFilter: ["style"] }); };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachObserver);
  } else {
    attachObserver();
  }

  // If the modal is already open (rare), try once
  setTimeout(renderButtons, 200);
})();
