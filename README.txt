
Greyson’s Used Boiler Parts & Surplus — Multi‑Page Site with Cart + PayPal
============================================================================

Pages
-----
- index.html      (Home)
- inventory.html  (Product catalog with Add to Cart)
- about.html
- contact.html
- css/style.css
- js/cart.js
- js/payments.js
- images/logo.png (logo included)

Cart
----
- Fully client-side cart stored in localStorage (works across pages).
- Slide-over cart opens from the top-right cart button on ANY page.
- Quantity controls, remove item, running total.

PayPal
------
- Uses PayPal Smart Buttons (client-side) for a sandbox-ready checkout.
- Replace the placeholder client id by setting `window.PAYPAL_CLIENT_ID`:
  Example: Add this inline script BEFORE payments.js on each page:
    <script>window.PAYPAL_CLIENT_ID = "YOUR_SANDBOX_OR_LIVE_CLIENT_ID";</script>
- For production, best practice is server-side order creation/capture.
  This build uses client-side capture for simplicity.

Styling
-------
- Dark steel + frost blue + rust orange.
- Mobile-friendly; cart drawer becomes full screen on small devices.
- PayPal card entry modals are scrollable on mobile.

Next Steps
----------
1) Replace product placeholders in inventory.html.
2) Add photos to /images and reference them in product cards.
3) Set window.PAYPAL_CLIENT_ID to your PayPal Client ID.
4) (Optional) Implement a small server to securely create/capture orders and record them.
