const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_now";

/* =========================
   AUTH MIDDLEWARE
========================= */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  // 1. Header check
  if (!header) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  // 2. Bearer format check
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Header must start with 'Bearer '" });
  }

  // 3. Extract token safely
  const token = header.replace("Bearer", "").trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // ✅ NORMALIZE USER OBJECT (THIS IS THE FIX)
    req.user = {
      id: payload.id || payload._id, // <-- CRITICAL FIX
      role: payload.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* =========================
   ADMIN GUARD
========================= */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userRole = req.user.role.toUpperCase();

  if (userRole !== "ADMIN") {
    return res.status(403).json({ error: "Admin required" });
  }

  next();
}

module.exports = { authMiddleware, requireAdmin };
