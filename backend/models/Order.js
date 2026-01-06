const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: String,
  email: String,
  stripeSessionId: String,
  paymentIntentId: String,
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  amount: Number,
  currency: String,
  items: [
    {
      name: String,
      quantity: Number,
      price: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
