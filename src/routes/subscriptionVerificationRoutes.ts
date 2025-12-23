import express from "express";

const router = express.Router();

import { reviewSubscriptionHandler  } from "../controllers/adminDashboard/adminApprovalOfSubscriptionVerificationController";
import { initSubscriptionVerificationsHandler } from "../controllers/subscriptionVerificationController";
import { authenticate } from "../middlewares/authMiddlewares";
import { requireAdmin } from "../middlewares/requireAdmin";
import { subscriptionImageUpload } from "../config/multer/subscriptionImage.multer";

router.post("/review/subscription", requireAdmin, reviewSubscriptionHandler);

router.post(
  "/initiate/subscription/verification",
  authenticate,
  subscriptionImageUpload.single("image"),
  initSubscriptionVerificationsHandler
);

export default router;


