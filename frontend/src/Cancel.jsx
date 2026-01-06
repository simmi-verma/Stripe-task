import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import "./style/Cancel.css";

export default function Cancel() {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchTransaction = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/checkout-session/${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch transaction details");
        const data = await res.json();
        setTransaction(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch transaction details.");
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [sessionId]);

  if (loading) return <p className="cancel-container">Loading transaction...</p>;
  if (error) return <p className="cancel-container">{error}</p>;

  return (
    <div className="cancel-container">
      <div className="cancel-icon">❌</div>
      <h2 className="cancel-message">Payment Cancelled</h2>

      {transaction && (
        <div className="transaction-details">
          <p><strong>Transaction ID:</strong> {transaction.stripeSessionId}</p>
          <p><strong>Status:</strong> {transaction.status || "Cancelled"}</p>
          <p><strong>Amount:</strong> ₹{transaction.amount} {transaction.currency?.toUpperCase()}</p>
          <p><strong>Customer Email:</strong> {transaction.email || "N/A"}</p>

          <h3>Items in Cart:</h3>
          <ul>
            {transaction.items?.map((item, idx) => (
              <li key={idx}>
                {item.name} × {item.quantity} - ₹{item.price * item.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to="/" className="back-home-btn">Back to Home</Link>
    </div>
  );
}
