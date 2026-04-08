const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  phone: String,
  username: String,
  password: String,
  passwordHistory: [String],
  role: String,

  // OTP recovery
  resetOTP: String,
  resetOTPExpiry: Date,

  //  MFA fields
  securityQuestion: String,
  securityAnswer: String,
  otpSecret: String,

  //  PKI Public Key
  publicKey: String
});

module.exports = mongoose.model("User", UserSchema);
