import { useContext, useState } from "react";
import { CartContext } from "./CartContext";
import "./style/Cart.css";

export default function Cart() {
  const { cart, updateQty, removeFromCart } = useContext(CartContext);
  const [email, setEmail] = useState("");

  const checkout = async () => {
    if (cart.length === 0) return alert("Your cart is empty");
    if (!email) return alert("Please enter your email");

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: cart, userId: "guest-user", email }),
      });

      const data = await res.json();
      if (!data.url) throw new Error("Stripe URL not received");

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Please try again.");
    }
  };

  return (
    <div className="cart-container">
      <h2 className="cart-title">Your Cart</h2>
      {cart.length === 0 && <p>Your cart is empty</p>}

      {cart.map(item => (
        <div key={item.id} className="cart-item">
          <p>{item.name}</p>
          <input
            type="number"
            value={item.quantity}
            min="1"
            onChange={e => updateQty(item.id, Number(e.target.value))}
          />
          <button onClick={() => removeFromCart(item.id)}>Remove</button>
        </div>
      ))}

      {cart.length > 0 && (
        <>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "15px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <button className="checkout-btn" onClick={checkout}>Checkout</button>
        </>
      )}
    </div>
  );
}
