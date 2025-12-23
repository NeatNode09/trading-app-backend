import multer from "multer";
import path from "path";
import { ensureDirExists, generateFileName } from "../../utils/fileUtility";

const uploadPath = path.join(process.cwd(), "uploads/chat/videos");
ensureDirExists(uploadPath);

export const chatVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) =>
      cb(null, generateFileName(file.originalname)),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files allowed"));
    }
    cb(null, true);
  },
});
