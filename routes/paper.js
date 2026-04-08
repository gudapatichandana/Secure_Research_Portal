const express = require("express");
const crypto = require("crypto");
const Paper = require("../models/Paper");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");
const { encrypt } = require("../utils/encryption");
const { dh, generateSharedKey } = require("../utils/keyExchange");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// MULTER CONFIG
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

/* ================= STUDENT: UPLOAD PAPER ================= */
router.post("/upload", auth, acl("upload"), upload.single("paperFile"), async (req, res) => {
  try {
    const { title, content, secureMessage, encryptedMessage, encryptedSymKey } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title required" });
    }

    /* ===== BACKWARD COMPATIBILITY ===== */
    // If regular content is sent, encrypt it server-side (legacy flow)
    // If encryptedMessage is sent, save it directly (new secure flow)

    let dbEncryptedContent = "";
    if (content) {
      dbEncryptedContent = encrypt(content);
    }

    let dbEncryptedMessage = encryptedMessage || "";
    if (secureMessage && !encryptedMessage) {
      dbEncryptedMessage = encrypt(secureMessage);
    }

    /* ===== DIGITAL SIGNATURE (SHA-256 HASH) ===== */
    const payloadToHash = content || encryptedMessage || secureMessage || "empty";
    const hash = crypto
      .createHash("sha256")
      .update(payloadToHash)
      .digest("hex");

    await Paper.create({
      title,
      encryptedContent: dbEncryptedContent || "SECURE_UPLOAD",
      encryptedMessage: dbEncryptedMessage,
      encryptedSymKey: encryptedSymKey || null,
      filename: req.file ? req.file.filename : null,
      hash,
      owner: req.user.username,
      integrityStatus: "NONE",
      isVerified: false
    });

    res.json({
      message: "Paper uploaded with Digital Signature (Hash)"
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= STUDENT: VIEW OWN PAPERS ================= */
router.get("/mine", auth, acl("upload"), async (req, res) => {
  const papers = await Paper.find({ owner: req.user.username, deleted: { $ne: true } });
  const papersDecrypted = papers.map(p => {
    const { decrypt } = require("../utils/encryption");
    let plain = "";
    if (p.encryptedContent && p.encryptedContent !== "SECURE_UPLOAD") {
      plain = decrypt(p.encryptedContent);
    }

    let secureMsg = "";
    if (p.encryptedMessage) {
      if (p.encryptedSymKey) {
        secureMsg = p.encryptedMessage; // PKI Encrypted
      } else {
        secureMsg = decrypt(p.encryptedMessage); // Server-side Encrypted
      }
    }

    return {
      ...p.toObject(),
      content: plain,
      secureMessage: secureMsg,
      integrityStatus: p.integrityStatus || "NONE"
    };
  });
  res.json(papersDecrypted);
});

/* ================= REVIEWER / ADMIN: VIEW ALL PAPERS ================= */
router.get("/view", auth, acl("read"), async (req, res) => {
  const papers = await Paper.find({ deleted: { $ne: true } });
  const papersDecrypted = papers.map(p => {
    const { decrypt } = require("../utils/encryption");
    let plain = "";
    if (p.encryptedContent && p.encryptedContent !== "SECURE_UPLOAD") {
      plain = decrypt(p.encryptedContent);
    }

    let secureMsg = "";
    if (p.encryptedMessage) {
      if (p.encryptedSymKey) {
        secureMsg = p.encryptedMessage; // PKI Encrypted
      } else {
        secureMsg = decrypt(p.encryptedMessage); // Server-side Encrypted
      }
    }

    return {
      ...p.toObject(),
      content: plain,
      secureMessage: secureMsg,
      integrityStatus: p.integrityStatus || "NONE"
    };
  });
  res.json(papersDecrypted);
});

/* ================= VERIFY DIGITAL SIGNATURE ================= */
router.get("/verify/:id", auth, acl("read"), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    // REAL Recalculate hash for integrity check
    let payloadToHash = "empty";

    if (paper.encryptedContent && paper.encryptedContent !== "SECURE_UPLOAD") {
      // It was hashed as plain text abstract, so we must decrypt to get the plain text back
      const { decrypt } = require("../utils/encryption");
      payloadToHash = decrypt(paper.encryptedContent);
    } else if (paper.encryptedMessage) {
      // It was hashed as the encrypted hex string
      payloadToHash = paper.encryptedMessage;
    }

    const recalculatedHash = crypto
      .createHash("sha256")
      .update(payloadToHash)
      .digest("hex");

    const integrity =
      recalculatedHash === paper.hash ? "VALID" : "TAMPERED";

    paper.integrityStatus = integrity;
    if (integrity === "VALID") {
      paper.isVerified = true;
    } else {
      paper.isVerified = false;
    }
    await paper.save();

    res.json({
      title: paper.title,
      integrity,
      storedHash: paper.hash
    });

  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

/* ================= ADMIN: SOFT DELETE PAPER ================= */
router.delete("/:id", auth, acl("delete"), async (req, res) => {
  await Paper.findByIdAndUpdate(req.params.id, {
    deleted: true,
    deletedAt: new Date()
  });
  res.json({ message: "Paper moved to bin" });
});

/* ================= ADMIN: VIEW DELETED PAPERS ================= */
router.get("/bin", auth, acl("delete"), async (req, res) => {
  const papers = await Paper.find({ deleted: true });
  const papersDecrypted = papers.map(p => {
    const { decrypt } = require("../utils/encryption");
    let plain = "";
    if (p.encryptedContent && p.encryptedContent !== "SECURE_UPLOAD") {
      plain = decrypt(p.encryptedContent);
    }

    let secureMsg = "";
    if (p.encryptedMessage) {
      if (p.encryptedSymKey) {
        secureMsg = p.encryptedMessage;
      } else {
        secureMsg = decrypt(p.encryptedMessage);
      }
    }

    return {
      ...p.toObject(),
      content: plain,
      secureMessage: secureMsg,
      integrityStatus: p.integrityStatus || "NONE"
    };
  });
  res.json(papersDecrypted);
});

/* ================= ADMIN: RESTORE PAPER ================= */
router.put("/restore/:id", auth, acl("delete"), async (req, res) => {
  await Paper.findByIdAndUpdate(req.params.id, {
    deleted: false,
    deletedAt: null
  });
  res.json({ message: "Paper restored" });
});

/* ================= REVIEWER: SUBMIT REVIEW ================= */
router.post("/review/:id", auth, acl("read"), async (req, res) => {
  try {
    const { score, comment, status } = req.body;
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    // Add Review
    paper.reviews.push({
      reviewer: req.user.username,
      score,
      comment
    });

    // Update Status
    if (status) {
      paper.status = status;
    }

    await paper.save();
    res.json({ message: "Review submitted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Review failed" });
  }
});

/* ================= ADMIN: UPDATE STATUS ONLY ================= */
router.put("/status/:id", auth, acl("delete"), async (req, res) => {
  try {
    const { status } = req.body;
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    paper.status = status;
    await paper.save();

    res.json({ message: "Status updated to " + status });
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

module.exports = router;
