const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const User = require("../models/User");
const sendOTPEmail = require("../utils/email");
const auth = require("../middleware/auth");

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone,
      username,
      password,
      role,
      securityQuestion,
      securityAnswer
    } = req.body;

    const trimmedPassword = password.trim();

    // Gmail only
    const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailPattern.test(email)) {
      return res.status(400).json({ message: "Only @gmail.com allowed" });
    }

    // Phone validation
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone must be 10 digits" });
    }

    const normalizedRole = role.toLowerCase();
    if (!["student", "reviewer", "admin"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Duplicate check
    const exists = await User.findOne({
      $or: [{ username }, { email }, { phone }]
    });
    if (exists) {
      return res.status(400).json({
        message: "Username / Email / Phone already exists"
      });
    }

    // Hash password ONCE
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    const hashedSecurityAnswer = await bcrypt.hash(securityAnswer, 10);
    const secret = speakeasy.generateSecret({ length: 20 });

    await User.create({
      fullname,
      email,
      phone,
      username,
      password: hashedPassword,
      passwordHistory: [hashedPassword],
      role: normalizedRole,
      securityQuestion,
      securityAnswer: hashedSecurityAnswer,
      otpSecret: secret.base32
    });

    res.json({ message: "Account created successfully" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const trimmedPassword = password.trim();

    console.log(" LOGIN ATTEMPT:", username);
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const valid = await bcrypt.compare(trimmedPassword, user.password);
    if (!valid) {
      console.log(" INVALID PASSWORD FOR:", username);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // FIRST STEP SUCCESS → REQUIRE MFA
    return res.json({
      message: "Password verified",
      mfaRequired: true,
      username: user.username
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= GET SECURITY QUESTION ================= */
router.get("/security-question/:username", async (req, res) => {
  const user = await User.findOne({ username: req.params.username });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    securityQuestion: user.securityQuestion
  });
});

/* ================= VERIFY SECURITY ANSWER (FINAL LOGIN) ================= */
router.post("/verify-security-answer", async (req, res) => {
  const { username, answer } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(answer, user.securityAnswer);
  if (!valid) {
    return res.status(400).json({ message: "Incorrect security answer" });
  }

  const token = jwt.sign(
    { username: user.username, role: user.role },
    "secretkey",
    { expiresIn: "1h" }
  );

  res.json({
    message: "MFA successful",
    token,
    username: user.username,
    role: user.role
  });
});

/* ================= SEND RESET OTP ================= */
router.post("/send-reset-otp", async (req, res) => {
  try {
    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.resetOTPExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOTPEmail(user.email, otp);

    console.log("📧 OTP SENT:", otp);

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* ================= VERIFY RESET OTP ================= */
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user || !user.resetOTP) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > user.resetOTPExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.resetOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.resetOTP = "VERIFIED";
    await user.save();

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user || user.resetOTP !== "VERIFIED") {
      console.log(" RESET ATTEMPT FAILED: User not found or OTP not verified for", identifier);
      return res.status(400).json({ message: "OTP not verified" });
    }

    const trimmedPassword = password.trim();
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    user.password = hashedPassword;
    user.passwordHistory.push(hashedPassword);
    user.resetOTP = null;
    user.resetOTPExpiry = null;

    await user.save();

    console.log(" PASSWORD RESET FOR:", user.username);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET ERROR:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
});

/* ================= SAVE PUBLIC KEY ================= */
router.post("/save-public-key", auth, async (req, res) => {
  try {
    const { publicKey } = req.body;
    const user = await User.findOneAndUpdate(
      { username: req.user.username },
      { publicKey },
      { new: true }
    );
    console.log(`✅ PUBLIC KEY SAVED for ${req.user.username} (${req.user.role})`);
    console.log(`   Key preview: ${publicKey.substring(0, 50)}...`);
    res.json({ message: "Public Key saved" });
  } catch (err) {
    console.error("❌ SAVE KEY ERROR:", err);
    res.status(500).json({ message: "Failed to save key" });
  }
});

/* ================= LEGACY: SAVE PUBLIC KEY ================= */
router.post("/public-key", async (req, res) => {
  try {
    const { username, publicKey } = req.body;
    await User.findOneAndUpdate({ username }, { publicKey });
    res.json({ message: "Public Key saved" });
  } catch (err) {
    res.status(500).json({ message: "Failed to save key" });
  }
});

/* ================= GET ADMIN PUBLIC KEY ================= */
router.get("/admin-key", async (req, res) => {
  // Get ANY admin that has a public key setup
  const admin = await User.findOne({
    role: "admin",
    publicKey: { $exists: true, $ne: "" }
  });

  if (!admin) {
    return res.status(404).json({ message: "Admin key not found" });
  }
  res.json({ publicKey: admin.publicKey });
});

module.exports = router;
