const express = require("express");
const Sales = require("../models/Sales");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// helper: IST → UTC
const istToUTC = (date) => {
  return new Date(date.getTime() - (5.5 * 60 * 60 * 1000));
};

router.get("/sales", authMiddleware, async (req, res) => {
  try {
    const userRole = (req.user.role || "").toUpperCase();
    if (userRole !== "ADMIN") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { type = "day" } = req.query;

    const nowIST = new Date();           // current IST
    let startIST = new Date(nowIST);
    let endIST = new Date(nowIST);

    // END = end of today IST
    endIST.setHours(23, 59, 59, 999);

    switch (type) {
      case "day":
        startIST.setHours(0, 0, 0, 0);
        break;

      case "week":
        startIST.setDate(startIST.getDate() - 6); // includes yesterday
        startIST.setHours(0, 0, 0, 0);
        break;

      case "month":
        startIST.setMonth(startIST.getMonth() - 1);
        startIST.setHours(0, 0, 0, 0);
        break;

      case "year":
        startIST.setFullYear(startIST.getFullYear() - 1);
        startIST.setHours(0, 0, 0, 0);
        break;

      case "all":
        startIST = new Date(0);
        break;
    }

    //  CONVERT TO UTC FOR MONGODB
    const startUTC = istToUTC(startIST);
    const endUTC = istToUTC(endIST);

    const sales = await Sales.find({
      createdAt: {
        $gte: startUTC,
        $lte: endUTC
      }
    }).sort({ createdAt: -1 });

    const totalAmount = sales.reduce(
      (sum, s) => sum + (Number(s.orderTotal) || 0),
      0
    );

    res.json({
      count: sales.length,
      totalAmount,
      sales
    });

  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ message: "Report error" });
  }
});

module.exports = router;
