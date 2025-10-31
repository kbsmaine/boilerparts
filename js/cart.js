// Dark Modal Cart with Interactive Add Buttons + Cart Pulse
console.log("✅ Modal Cart Loaded");

function loadCart(){return JSON.parse(localStorage.getItem('cart')||'[]')}
function saveCart(i){localStorage.setItem('cart',JSON.stringify(i))}
function clearCart(){localStorage.removeItem('cart');renderCart();updateCartCount()}
function getCartTotal(){return loadCart().reduce((s,i)=>s+i.qty*parseFloat(i.price||0),0)}

function updateCartCount(){
  const el=document.getElementById("cartCount");
  if(!el)return;
  const items=loadCart(),total=items.reduce((s,i)=>s+i.qty,0);
  el.textContent=total;
  // Pulse animation
  el.classList.add('pulse');
  setTimeout(()=>el.classList.remove('pulse'),400);
}

// create modal UI if missing
function ensureCartUI(){
  if(document.getElementById("cartModal"))return;
  document.body.insertAdjacentHTML('beforeend',`
  <div id="cartModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,.85);color:#fff;z-index:9999;justify-content:center;align-items:center;">
    <div id="cartContent" style="background:#111827;border-radius:12px;padding:20px;width:90%;
    max-width:500px;max-height:80%;overflow-y:auto;position:relative;">
      <button id="closeCartBtn" style="position:absolute;top:10px;right:14px;background:none;border:none;
      color:#aaa;font-size:22px;cursor:pointer;">×</button>
      <h2 style="margin-top:0;text-align:center;">Your Cart</h2>
      <div id="cartItems"></div>
      <div id="cartTotal" style="margin-top:12px;text-align:center;font-weight:700;">Total: $0.00</div>
      <div id="paypal-container" style="margin-top:18px;"></div>
    </div>
  </div>`),
  document.getElementById("closeCartBtn").onclick=closeCart;
}

// render items
function renderCart(){
  ensureCartUI();
  const items=loadCart(),c=document.getElementById('cartItems'),t=document.getElementById('cartTotal');
  if(!c)return;
  c.innerHTML=items.length?items.map(i=>`
  <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #222;">
    <div><strong>${i.name}</strong><br><small>$${parseFloat(i.price).toFixed(2)}</small></div>
    <div>
      <button data-dec="${i.id}" style="background:#1f2937;color:#fff;border:none;padding:2px 8px;margin-right:4px;">−</button>
      ${i.qty}
      <button data-inc="${i.id}" style="background:#1f2937;color:#fff;border:none;padding:2px 8px;margin-left:4px;">+</button>
      <button data-del="${i.id}" style="background:none;color:#f87171;border:none;margin-left:8px;">✕</button>
    </div>
  </div>`).join(''):`<p style="text-align:center;color:#aaa;">Your cart is empty.</p>`;
  t.textContent=`Total: $${getCartTotal().toFixed(2)}`;
  updateCartCount();initPayPal();
}

// add item + button feedback
function addToCart(id,name,price,qty=1,btn){
  const items=loadCart(),e=items.find(i=>i.id===id);
  e?e.qty+=qty:items.push({id,name,price,qty});
  saveCart(items);updateCartCount();renderCart();

  // visual feedback on button
  if(btn){
    btn.classList.add('added');
    const original=btn.textContent;
    btn.textContent='✓ Added!';
    setTimeout(()=>{
      btn.classList.remove('added');
      btn.textContent=original;
    },1200);
  }
}

function openCart(){ensureCartUI();renderCart();
  document.getElementById('cartModal').style.display='flex'}
function closeCart(){const m=document.getElementById('cartModal');if(m)m.style.display='none'}

// initial setup
document.addEventListener('DOMContentLoaded',()=>{
  ensureCartUI();updateCartCount();
  document.querySelectorAll('.btn.add').forEach(b=>{
    b.addEventListener('click',()=>{
      addToCart(b.dataset.id,b.dataset.name,parseFloat(b.dataset.price),1,b);
    });
  });
  const openBtn=document.getElementById('openCartBtn');
  if(openBtn)openBtn.addEventListener('click',openCart);
});

// handle + - delete
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.dataset.dec||t.dataset.inc||t.dataset.del){
    let items=loadCart();
    if(t.dataset.dec){const it=items.find(i=>i.id===t.dataset.dec);if(it)it.qty=Math.max(1,it.qty-1);}
    if(t.dataset.inc){const it=items.find(i=>i.id===t.dataset.inc);if(it)it.qty++;}
    if(t.dataset.del){items=items.filter(i=>i.id!==t.dataset.del);}
    saveCart(items);renderCart();
  }
});

// PayPal setup
function initPayPal(){
  const c=document.getElementById('paypal-container');
  if(!c)return;c.innerHTML='';
  try{
    if(typeof paypal!=='undefined'&&paypal.Buttons){
      paypal.Buttons({
        style:{color:'gold',shape:'rect',label:'paypal'},
        createOrder:(d,a)=>a.order.create({purchase_units:[{amount:{value:getCartTotal().toFixed(2)}}]}),
        onApprove:(d,a)=>a.order.capture().then(det=>{
          alert('Transaction completed by '+det.payer.name.given_name);
          clearCart();closeCart();
        }),
        onError:err=>console.error('PayPal error:',err)
      }).render('#paypal-container');
    }else{
      c.innerHTML='<p style="color:#aaa;text-align:center;">PayPal unavailable</p>';
    }
  }catch(err){console.error('PayPal init failed',err);}
}
