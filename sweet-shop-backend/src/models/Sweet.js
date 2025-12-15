const mongoose = require("mongoose");

const sweetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sweet", sweetSchema);
