import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import "./style/Success.css";

export default function Success() {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id"); // from Stripe redirect

  useEffect(() => {
    if (!sessionId) return;

    fetch(`${import.meta.env.VITE_API_URL}/checkout-session/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setTransaction(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to fetch transaction details.");
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) return <p className="success-container">Loading transaction...</p>;
  if (error) return <p className="success-container">{error}</p>;

  return (
    <div className="success-container">
      <div className="success-icon">✅</div>
      <h2 className="success-message">Payment Successful</h2>

      <div className="transaction-details">
        <p><strong>Transaction ID:</strong> {transaction.id}</p>
        <p><strong>Amount Paid:</strong> ₹{transaction.amount} {transaction.currency.toUpperCase()}</p>
        <p><strong>Payment Method:</strong> {transaction.payment_method}</p>
        <p><strong>Date:</strong> {transaction.date}</p>

        <h3>Items Purchased:</h3>
        <ul>
          {transaction.items.map((item, idx) => (
            <li key={idx}>
              {item.name} × {item.quantity} - ₹{item.price * item.quantity}
            </li>
          ))}
        </ul>
      </div>

      <Link to="/" className="back-home-btn">Back to Home</Link>
    </div>
  );
}
