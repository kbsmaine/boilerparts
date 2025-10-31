// Safe PayPal loader — waits until SDK is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('paypal-container');
  if (!container) return;

  // Wait for PayPal SDK to be ready
  function initPayPalButtons() {
    if (typeof paypal === 'undefined' || typeof paypal.Buttons === 'undefined') {
      console.warn('⏳ Waiting for PayPal SDK to load...');
      setTimeout(initPayPalButtons, 400);
      return;
    }

    console.log('✅ PayPal SDK loaded, initializing buttons...');
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: (data, actions) => {
        const total = window.getCartTotal ? getCartTotal() : 0;
        return actions.order.create({
          purchase_units: [{ amount: { value: total.toFixed(2) } }]
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then(details => {
          alert('Transaction completed by ' + details.payer.name.given_name + '!');
          if (typeof clearCart === 'function') clearCart();
        });
      },
      onError: err => console.error('PayPal Error:', err)
    }).render('#paypal-container');
  }

  // Start waiting loop
  initPayPalButtons();
});
