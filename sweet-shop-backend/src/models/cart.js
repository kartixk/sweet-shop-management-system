const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  sweet: { type: mongoose.Schema.Types.ObjectId, ref: "Sweet", required: true },
  sweetName: { type: String, required: true },
  price: { type: Number, required: true },
  availableQuantity: { type: Number, required: true },
  selectedQuantity: { type: Number, required: true, min: 1 }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  total: { type: Number, default: 0 }
});

module.exports = mongoose.model("Cart", cartSchema);
