import express from "express";
import { addPartnerHandler, getAllPartnersHandler } from "../controllers/adminDashboard/partnerManagementController";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = express.Router();


router.post("/add-partner", requireAdmin, addPartnerHandler);
router.get("/partners", requireAdmin, getAllPartnersHandler);


export default router;