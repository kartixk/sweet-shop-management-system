const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  sweet: { type: mongoose.Schema.Types.ObjectId, ref: "Sweet", required: true },
  sweetName: String,
  price: Number,
  quantity: Number,
  totalPrice: Number
});

const salesSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [saleItemSchema],
  orderTotal: Number,
  status: { type: String, default: "PLACED" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Sales", salesSchema);
