import express from "express"
import { postAnnouncementHandler, getActiveAnnouncementsHandler } from "../controllers/adminDashboard/announcementsController";
import { requireAdmin } from "../middlewares/requireAdmin";
const router = express.Router();

router.post("/announcement", requireAdmin, postAnnouncementHandler);
router.get("/announcements/active", requireAdmin, getActiveAnnouncementsHandler);

export default router;