require("dotenv").config();
const app = require("./app");
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sweet-shop";

mongoose.connect(MONGO_URI, { family: 4 })
  .then(() => {
    app.listen(4000, () => {
      console.log("🚀 Server running at http://localhost:4000");
    });
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
  });
