import multer from "multer";
import path from "path";
import { ensureDirExists, generateFileName } from "../../utils/fileUtility";

const uploadPath = path.join(process.cwd(), "uploads/chat/images");
ensureDirExists(uploadPath);

export const chatImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) =>
      cb(null, generateFileName(file.originalname)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    console.log("File type: ", file.mimetype);
    
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});
