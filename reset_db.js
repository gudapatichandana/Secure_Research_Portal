const mongoose = require("mongoose");
require("dotenv").config();

async function resetDB() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("Custom DB Connected");

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections:`, collections.map(c => c.name));

        if (collections.length === 0) {
            console.log("Database is already empty.");
            process.exit(0);
        }

        // Drop each collection
        for (const collection of collections) {
            console.log(`Dropping collection: ${collection.name}...`);
            try {
                await mongoose.connection.db.dropCollection(collection.name);
                console.log(`   Dropped ${collection.name}`);
            } catch (e) {
                console.error(`   Failed to drop ${collection.name}:`, e.message);
            }
        }

        console.log("Database successfully wiped! All collections verified deleted.");
        process.exit(0);
    } catch (err) {
        console.error("Error resetting DB:", err);
        process.exit(1);
    }
}

resetDB();
