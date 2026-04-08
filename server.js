const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SERVE FRONTEND FILES
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Explicitly serve login page on root
app.get("/", (req, res) => {
  res.sendFile(require("path").join(__dirname, "public", "login.html"));
});

// ROUTES
app.use("/auth", require("./routes/auth"));
app.use("/paper", require("./routes/paper"));

// DB
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("MongoDB Connected");
    // Only listen in local mode, Vercel will handle its own server process
    if (process.env.NODE_ENV !== "production") {
      const PORT = 4000;
      app.listen(PORT, () =>
        console.log(`🚀 NEW SERVER RUNNING on http://localhost:${PORT} (Reset Version)`)
      );
    }
  })
  .catch(err => {
    console.error(" DB CONNECTION ERROR:", err.message);
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

module.exports = app;
