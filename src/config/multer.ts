import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// Ensure the uploads directory exists

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueName + ext);
    },
});

export const multerLocal = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed!"));
        } 
        cb(null, true);
    },

});

