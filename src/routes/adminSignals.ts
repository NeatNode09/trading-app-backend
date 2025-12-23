import express from "express";
import { createAnalysisPairHandler } from "../controllers/adminDashboard/adminSignalController";
import { requireAdmin } from "../middlewares/requireAdmin";
import { chatImageUpload } from "../config/multer/chateImage.multer";

const router = express.Router();

router.post("/create-signals", requireAdmin, chatImageUpload.single("image") ,createAnalysisPairHandler);

export default router;
