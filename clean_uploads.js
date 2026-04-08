const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');

if (fs.existsSync(uploadDir)) {
    fs.readdir(uploadDir, (err, files) => {
        if (err) throw err;

        console.log(`🧹 Cleaning 'uploads' directory (${files.length} files)...`);

        for (const file of files) {
            // Keep .gitkeep if it exists, or just delete everything
            if (file !== '.gitkeep') {
                fs.unlink(path.join(uploadDir, file), err => {
                    if (err) throw err;
                    console.log(`   Deleted: ${file}`);
                });
            }
        }

        // Slight delay to allow logs to flush
        setTimeout(() => {
            console.log(" Uploads directory cleaned.");
        }, 500);
    });
} else {
    console.log(" No 'uploads' directory found.");
}
