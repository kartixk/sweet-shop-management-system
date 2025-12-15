const express = require("express");
const Sweet = require("../models/Sweet");
const Sales = require("../models/Sales");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

/* -------------------------------------------------------
   Helper: Convert string to Title Case
------------------------------------------------------- */
const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/* -------------------------------------------------------
   1. GET ALL SWEETS (Public)
------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const sweets = await Sweet.find().sort({ createdAt: -1 });
    res.status(200).json(sweets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------
   2. CREATE / UPDATE SWEET (UPSERT) – Protected
------------------------------------------------------- */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, price, category, quantity, imageUrl } = req.body;

    if (
      !name ||
      price === undefined ||
      !category ||
      quantity === undefined ||
      !imageUrl
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const formattedName = toTitleCase(name);

    const sweet = await Sweet.findOneAndUpdate(
      { name: formattedName },
      {
        name: formattedName,
        price: Number(price),
        category,
        quantity: Number(quantity),
        imageUrl
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    //  TEST EXPECTS 201 + SWEET OBJECT DIRECTLY
    res.status(201).json(sweet);
  } catch (err) {
    console.error("Sweet upsert error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------
   3. UPDATE SWEET BY ID (Protected)
------------------------------------------------------- */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { quantity, price, name, category, imageUrl } = req.body;

    const updateData = {};
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (price !== undefined) updateData.price = Number(price);
    if (category) updateData.category = category;
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (name) updateData.name = toTitleCase(name);

    const updatedSweet = await Sweet.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedSweet) {
      return res.status(404).json({ message: "Sweet not found" });
    }

    res.status(200).json(updatedSweet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* -------------------------------------------------------
   4. DELETE SWEET (Admin Only)
------------------------------------------------------- */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const role = (req.user.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied (Admin only)" });
    }

    const deletedSweet = await Sweet.findByIdAndDelete(req.params.id);
    if (!deletedSweet) {
      return res.status(404).json({ message: "Sweet not found" });
    }

    res.status(200).json({ message: "Sweet deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------
   5. PURCHASE SWEET (Protected – Atomic)
------------------------------------------------------- */
router.post("/:id/purchase", authMiddleware, async (req, res) => {
  try {
    const quantityToBuy = Number(req.body.quantity) || 1;

    if (quantityToBuy <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const updatedSweet = await Sweet.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: quantityToBuy } },
      { $inc: { quantity: -quantityToBuy } },
      { new: true }
    );

    if (!updatedSweet) {
      return res.status(400).json({
        message: "Purchase failed: insufficient stock"
      });
    }

    // ✅ FINAL FIX: WORKS WITH req.user.id OR req.user._id
    await Sales.create({
      user: req.user.id || req.user._id,
      sweetName: updatedSweet.name,
      price: updatedSweet.price,
      quantity: quantityToBuy,
      totalPrice: updatedSweet.price * quantityToBuy,
      date: new Date()
    });

    res.status(200).json({
      message: `Successfully purchased ${quantityToBuy} ${updatedSweet.name}`
    });
  } catch (err) {
    console.error("Purchase Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------
   6. RESTOCK SWEET (Admin Only)
------------------------------------------------------- */
router.post("/:id/restock", authMiddleware, async (req, res) => {
  try {
    const role = (req.user.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const sweet = await Sweet.findByIdAndUpdate(
      req.params.id,
      { $inc: { quantity: Number(quantity) } },
      { new: true }
    );

    if (!sweet) {
      return res.status(404).json({ message: "Sweet not found" });
    }

    res.status(200).json({ message: "Restocked successfully", sweet });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
