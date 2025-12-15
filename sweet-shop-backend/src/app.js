const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/cart", require("./routes/cart"));
app.use("/api/sweets", require("./routes/sweets"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports")); // ✅ ADD THIS

app.get("/", (req, res) => res.send("Server Ready 🍬"));

module.exports = app;
