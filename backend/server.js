const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


app.use(cors());
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  const { cartItems } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: cartItems.map(item => ({
        price_data: {
          currency: "inr",
          product_data: { name: item.name },
          unit_amount: item.price * 100 // amount in paise
        },
        quantity: item.quantity
      })),
      success_url: "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/cancel"
    });

    res.json({
      url: session.url,                  // Redirect user to this URL
      checkoutSessionId: session.id,     // Checkout Session ID
      paymentIntentId: session.payment_intent, // PaymentIntent ID
      customerId: session.customer       // Customer ID (if available)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve Checkout Session (to verify payment)
app.get("/checkout-session/:id", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ["line_items", "payment_intent"],
    });

    res.json({
      id: session.id,
      amount: (session.amount_total / 100).toFixed(2),
      currency: session.currency,
      payment_method: session.payment_intent.payment_method_types[0],
      date: new Date(session.created * 1000).toLocaleString(),
      items: session.line_items.data.map(item => ({
        name: item.description,
        quantity: item.quantity,
        price: (item.price.unit_amount / 100).toFixed(2),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch session" });
  }
});


app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      console.log("✅ Payment successful!");
      console.log("Checkout Session ID:", session.id);
      console.log("PaymentIntent ID:", session.payment_intent);
      console.log("Customer ID:", session.customer);
      // TODO: Update your order database here as "paid"
      break;

    case "payment_intent.payment_failed":
      const paymentIntent = event.data.object;
      console.log("❌ Payment failed:", paymentIntent.id);
      // TODO: Mark payment as failed in your DB
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
