document.addEventListener('DOMContentLoaded',()=>{
  const c=document.getElementById('paypal-container');
  if(!c)return;
  try{
    paypal.Buttons({
      style:{layout:'vertical',color:'gold',shape:'rect',label:'paypal'},
      createOrder:(data,actions)=>{
        const total=window.getCartTotal?getCartTotal():0;
        return actions.order.create({purchase_units:[{amount:{value:total.toFixed(2)}}]});
      },
      onApprove:(data,actions)=>{
        return actions.order.capture().then(d=>{
          alert('Transaction completed by '+d.payer.name.given_name+'!');
          if(typeof clearCart==='function')clearCart();
        });
      },
      onError:err=>console.error('PayPal Error:',err)
    }).render('#paypal-container');
  }catch(err){console.error('PayPal Buttons failed to initialize',err);}
});
