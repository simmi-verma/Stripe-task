const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Stripe = require("stripe");
require("dotenv").config();

const Order = require("./models/Order");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/* ------------------ DATABASE ------------------ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

/* ------------------ MIDDLEWARE ------------------ */
app.use(cors());

// Stripe webhook needs raw body
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") return next();
  express.json()(req, res, next);
});

/* ------------------ CREATE CHECKOUT SESSION ------------------ */
app.post("/create-checkout-session", async (req, res) => {
  const { cartItems, userId, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email, // pass email to Stripe
      line_items: cartItems.map(item => ({
        price_data: {
          currency: "inr",
          product_data: { name: item.name },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      success_url: "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/cancel",
    });

    // Save order as PENDING with email
    await Order.create({
      userId,
      email,
      stripeSessionId: session.id,
      status: "pending",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ GET CHECKOUT SESSION DETAILS ------------------ */
app.get("/checkout-session/:sessionId", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    res.json({
      stripeSessionId: session.id,
      status: session.payment_status,
      amount: session.amount_total / 100,
      currency: session.currency,
      email: session.customer_email,
      payment_method: session.payment_intent?.payment_method_types?.[0] || "N/A",
      date: new Date(session.created * 1000).toLocaleString(),
      items: session.line_items.data.map(item => ({
        name: item.description,
        quantity: item.quantity,
        price: item.price.unit_amount / 100,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

/* ------------------ STRIPE WEBHOOK ------------------ */
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "payment_intent"],
    });

    await Order.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        status: "completed",
        paymentIntentId: session.payment_intent,
        amount: session.amount_total / 100,
        currency: session.currency,
        items: fullSession.line_items.data.map(item => ({
          name: item.description,
          quantity: item.quantity,
          price: item.price.unit_amount / 100,
        })),
        // keep email from pending order if Stripe doesn't return it
        email: session.customer_email || undefined,
      }
    );

    console.log("✅ Order completed:", session.id);
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    await Order.findOneAndUpdate(
      { paymentIntentId: intent.id },
      { status: "failed" }
    );
    console.log("❌ Payment failed:", intent.id);
  }

  res.json({ received: true });
});

/* ------------------ SERVER ------------------ */
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
