import { useContext } from "react";
import { CartContext } from "./CartContext";
import "./style/Cart.css";

export default function Cart() {
  const { cart, updateQty, removeFromCart } = useContext(CartContext);

  const checkout = async () => {
    const res = await fetch(
      import.meta.env.VITE_API_URL + "/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: cart })
      }
    );

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div className="cart-container">
      <h2 className="cart-title">Your Cart</h2>

      {cart.map(item => (
        <div className="cart-item" key={item.id}>
          <p className="item-name">{item.name}</p>

          <input
            type="number"
            className="qty-input"
            value={item.quantity}
            min="1"
            onChange={e => updateQty(item.id, Number(e.target.value))}
          />

          <button
            className="remove-btn"
            onClick={() => removeFromCart(item.id)}
          >
            Remove
          </button>
        </div>
      ))}

      {cart.length > 0 && (
        <button className="checkout-btn" onClick={checkout}>
          Checkout
        </button>
      )}
        <button className="checkout-btn" onClick={() => window.location.href = '/'}>
          Add More Items
        </button>
    </div>
  );
}
