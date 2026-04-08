const mongoose = require("mongoose");
require("dotenv").config();

async function debugDB() {
    try {
        console.log("Checking DB State...");
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

        // Check Collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections found:", collections.map(c => c.name));

        // Check Counts
        const userCount = await mongoose.connection.db.collection("users").countDocuments();
        const paperCount = await mongoose.connection.db.collection("papers").countDocuments();

        console.log(`Users Count: ${userCount}`);
        console.log(`Papers Count: ${paperCount}`);

        if (userCount === 0 && paperCount === 0) {
            console.log("Database is effectively empty (for User/Paper collections).");
        } else {
            console.log("Data still exists!");
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

debugDB();
