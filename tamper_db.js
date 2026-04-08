const mongoose = require("mongoose");
const Paper = require("./models/Paper");
require("dotenv").config();

async function tamperDB() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);

        // Find the most recent paper
        const paper = await Paper.findOne().sort({ createdAt: -1 });

        if (!paper) {
            console.log("No papers found to tamper with. Please upload one first.");
            process.exit(1);
        }

        console.log(`Found Paper: "${paper.title}"`);
        const sampleData = paper.encryptedContent !== "SECURE_UPLOAD" ? paper.encryptedContent : paper.encryptedMessage;
        console.log(`📄 Original Data starts with: ${sampleData.substring(0, 20)}...`);

        // Tamper the data!
        if (paper.encryptedContent && paper.encryptedContent !== "SECURE_UPLOAD") {
            paper.encryptedContent += "X"; // Just add a character to break the decryption/hash
        } else if (paper.encryptedMessage) {
            // Modify a single character in the hex string to break the hash
            const hex = paper.encryptedMessage;
            const modifiedHex = hex.substring(0, 10) + (hex[10] === 'a' ? 'b' : 'a') + hex.substring(11);
            paper.encryptedMessage = modifiedHex;
        }

        await paper.save();
        console.log("TAMPERING SUCCESSFUL! The database content has been modified without updating the signature.");
        console.log("Now go to the Admin Dashboard and click 'Verify Integrity' for this paper.");

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

tamperDB();
