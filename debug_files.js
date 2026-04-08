const mongoose = require('mongoose');
require('dotenv').config();
const Paper = require('./models/Paper');
const fs = require('fs');

async function debugFiles() {
    await mongoose.connect(process.env.MONGO_URI);
    const papers = await Paper.find({}, 'title filename');
    const diskFiles = fs.readdirSync('./uploads');

    console.log('--- DATABASE VS DISK ---');
    papers.forEach(p => {
        const exists = diskFiles.includes(p.filename);
        console.log(`Title: ${p.title}`);
        console.log(`DB Filename: [${p.filename}]`);
        console.log(`Exists on Disk: ${exists ? 'YES' : 'NO'}`);
        if (!exists) {
            console.log('Closest match on disk:');
            diskFiles.forEach(df => {
                if (df.includes(p.filename.split('-').pop())) {
                    console.log(`  - [${df}]`);
                }
            });
        }
        console.log('---');
    });
    await mongoose.disconnect();
}

debugFiles();
