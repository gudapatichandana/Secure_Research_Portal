const mongoose = require("mongoose");

// Target the database shown in the user's screenshot
const LEGACY_URI = "mongodb://127.0.0.1:27017/research_portal";

async function wipeLegacyDB() {
    try {
        console.log(` Connecting to LEGACY DB: ${LEGACY_URI}...`);
        await mongoose.connect(LEGACY_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to 'research_portal'");

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(` Found ${collections.length} collections:`, collections.map(c => c.name));

        if (collections.length === 0) {
            console.log(" 'research_portal' is already empty.");
            process.exit(0);
        }

        // Drop each collection
        for (const collection of collections) {
            console.log(`Dropping collection: ${collection.name}...`);
            try {
                await mongoose.connection.db.dropCollection(collection.name);
                console.log(`   Dropped ${collection.name}`);
            } catch (e) {
                console.error(`    Failed to drop ${collection.name}:`, e.message);
            }
        }

        console.log(" 'research_portal' successfully wiped!");
        process.exit(0);
    } catch (err) {
        console.error(" Error wiping legacy DB:", err);
        process.exit(1);
    }
}

wipeLegacyDB();
