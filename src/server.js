// server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

const connectDB = require("./config/db");
connectDB();
const app = express();

// Middlewares
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files (converted files)
app.use("/uploads", express.static(uploadDir));

/**
 * ==============================
 * ROUTES
 * ==============================
 */
const convertRoutes = require("./routes/convert.routes");
app.use("/api/convert", convertRoutes);

// Root route for debugging
app.get("/", (req, res) => {
  res.send("✅ Backend is running. Try /api/convert");
});

// 404 Handler
app.use((req, res, next) => {
  console.error(`❌ Route not found: ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ error: "Something went wrong", details: err.message });
});

/**
 * ==============================
 * START SERVER
 * ==============================
 */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
);
