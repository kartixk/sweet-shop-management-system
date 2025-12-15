const express = require("express");
const Cart = require("../models/cart");
const Sweet = require("../models/Sweet");
const Sales = require("../models/Sales");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

/* ===================== GET CART ===================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    res.json(cart || { items: [], total: 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

/* ================= ADD / UPDATE ITEM (POST) ================= */
router.post("/items", authMiddleware, async (req, res) => {
  try {
    const { sweetId, quantity } = req.body;

    if (!sweetId || quantity < 1) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const sweet = await Sweet.findById(sweetId);
    if (!sweet) return res.status(404).json({ message: "Sweet not found" });

    if (quantity > sweet.quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [], total: 0 });
    }

    const index = cart.items.findIndex(i => i.sweet.equals(sweet._id));

    if (index > -1) {
      cart.items[index].selectedQuantity = quantity;
      cart.items[index].availableQuantity = sweet.quantity;
      cart.items[index].price = sweet.price;
    } else {
      cart.items.push({
        sweet: sweet._id,
        sweetName: sweet.name,
        price: sweet.price,
        selectedQuantity: quantity,
        availableQuantity: sweet.quantity
      });
    }

    cart.total = cart.items.reduce(
      (sum, i) => sum + i.selectedQuantity * i.price,
      0
    );

    await cart.save();
    res.json(cart);

  } catch (err) {
    console.error("ADD TO CART ERROR:", err);
    res.status(500).json({ message: "Failed to update cart" });
  }
});

/* ================= UPDATE ITEM QUANTITY (PUT) - NEW ================= */
// This is the new route needed for your + / - buttons
router.put("/items/:sweetId", authMiddleware, async (req, res) => {
  try {
    const { sweetId } = req.params;
    const { quantity } = req.body;

    // Basic Validation
    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Find the item in the array
    const itemIndex = cart.items.findIndex(item => item.sweet.toString() === sweetId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Optional: Check Stock again before updating
    const sweet = await Sweet.findById(sweetId);
    if (sweet && sweet.quantity < quantity) {
         return res.status(400).json({ message: `Insufficient stock. Max available: ${sweet.quantity}` });
    }

    // Update the quantity
    cart.items[itemIndex].selectedQuantity = quantity;
    
    // Recalculate Total
    cart.total = cart.items.reduce(
      (sum, i) => sum + i.selectedQuantity * i.price, 
      0
    );

    await cart.save();
    res.json(cart);

  } catch (err) {
    console.error("UPDATE QUANTITY ERROR:", err);
    res.status(500).json({ message: "Failed to update quantity" });
  }
});

/* ================= REMOVE ITEM ================= */
router.delete("/items/:sweetId", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      i => !i.sweet.equals(req.params.sweetId)
    );

    cart.total = cart.items.reduce(
      (sum, i) => sum + i.selectedQuantity * i.price,
      0
    );

    await cart.save();
    res.json(cart);

  } catch (err) {
    console.error("REMOVE ITEM ERROR:", err);
    res.status(500).json({ message: "Failed to remove item" });
  }
});

/* ================= CONFIRM ORDER ================= */
router.post("/confirm", authMiddleware, async (req, res) => {
  console.log(" CONFIRM ORDER HIT by user:", req.user.id);

  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let orderTotal = 0;
    const saleItems = [];

    for (const item of cart.items) {
      const sweet = await Sweet.findById(item.sweet);

      if (!sweet) {
        return res.status(400).json({
          message: `${item.sweetName} not found`
        });
      }

      if (sweet.quantity < item.selectedQuantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.sweetName}`
        });
      }

      // ✅ Reduce stock
      sweet.quantity -= item.selectedQuantity;
      await sweet.save();

      const totalPrice = item.price * item.selectedQuantity;
      orderTotal += totalPrice;

      saleItems.push({
        sweet: sweet._id,
        sweetName: item.sweetName,
        price: item.price,
        quantity: item.selectedQuantity,
        totalPrice
      });
    }

    // ✅ Save sale
    const sale = await Sales.create({
      user: req.user.id,
      items: saleItems,
      orderTotal
    });

    console.log(" Sale saved:", sale._id);

    // ✅ Clear cart
    cart.items = [];
    cart.total = 0;
    await cart.save();

    console.log("✅ Cart cleared");

    res.json({ message: "Order confirmed successfully 🎉" });

  } catch (err) {
    console.error("CONFIRM ORDER ERROR:", err.message);
    res.status(500).json({ message: err.message || "Order failed" });
  }
});

/* ================= BUY NOW ================= */
router.post("/buy-now", authMiddleware, async (req, res) => {
  try {
    const { sweetId, quantity } = req.body;

    const sweet = await Sweet.findById(sweetId);
    if (!sweet) {
      return res.status(404).json({ message: "Sweet not found" });
    }

    if (sweet.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // Reduce stock
    sweet.quantity -= quantity;
    await sweet.save();

    const totalPrice = sweet.price * quantity;

    // ✅ CRITICAL FIX: user is REQUIRED
    await Sales.create({
      user: req.user.id,
      items: [{
        sweet: sweet._id,
        sweetName: sweet.name,
        price: sweet.price,
        quantity,
        totalPrice
      }],
      orderTotal: totalPrice,
      status: "PLACED"
    });

    res.json({ message: "Order placed successfully 🎉" });

  } catch (err) {
    console.error("BUY NOW ERROR:", err);
    res.status(500).json({ message: "Buy now failed" });
  }
});

module.exports = router;