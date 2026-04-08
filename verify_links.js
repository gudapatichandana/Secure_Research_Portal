const mongoose = require('mongoose');
require('dotenv').config();
const Paper = require('./models/Paper');
const fs = require('fs');
const path = require('path');

async function debugFiles() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const papers = await Paper.find({}, 'title filename');
        const diskFiles = fs.readdirSync('./uploads');

        console.log('--- DIAGNOSTIC REPORT ---');
        console.log(`Total Papers in DB: ${papers.length}`);
        console.log(`Total Files in /uploads: ${diskFiles.length}\n`);

        papers.forEach(p => {
            console.log(`Title: ${p.title}`);
            if (!p.filename) {
                console.log(`  Issue: No filename in DB record.`);
            } else {
                const fullPath = path.join('uploads', p.filename);
                const exists = fs.existsSync(fullPath);
                console.log(`  Filename: [${p.filename}]`);
                console.log(`  Exists on Disk: ${exists ? 'YES' : 'NO'}`);
                if (!exists) {
                    const baseName = p.filename.split('-').pop();
                    const matches = diskFiles.filter(f => f.includes(baseName));
                    if (matches.length > 0) {
                        console.log(`  Potential Matches: ${matches.join(', ')}`);
                    }
                }
            }
            console.log('------------------------');
        });
    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debugFiles();
