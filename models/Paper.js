const mongoose = require("mongoose");

const PaperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  encryptedContent: {
    type: String,
    required: true
  },

  //  Digital Signature (SHA-256 hash)
  hash: {
    type: String,
    required: true
  },

  owner: {
    type: String,
    required: true
  },

  //  End-to-End Encrypted Message
  encryptedMessage: String, // AES encrypted content
  encryptedSymKey: String,  // RSA encrypted AES key (for Admin)

  //  Uploaded File Information
  filename: String,

  //  Review Status
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  integrityStatus: {
    type: String,
    enum: ["NONE", "VALID", "TAMPERED"],
    default: "NONE"
  },

  //  Reviews
  reviews: [{
    reviewer: String,
    score: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }],

  deleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Paper", PaperSchema);
