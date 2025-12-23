import express from "express";
import { getAllSubscriptionsHandler, updateSubscriptionHandler, deleteSubscriptionHandler} from "../controllers/adminDashboard/subscriptionController";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = express.Router();

router.get("/subscriptions", requireAdmin, getAllSubscriptionsHandler);
router.put("/subscriptions/:subscriptionId", requireAdmin, updateSubscriptionHandler);
router.delete("/subscriptions/:subscriptionId", requireAdmin, deleteSubscriptionHandler);

export default router;
