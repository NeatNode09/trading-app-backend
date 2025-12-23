import express from "express"

import { getRecentUsersHandler, getPaginatedUsersHandler, addUserHandler } from "../controllers/adminDashboard/usersManagementController";
import { getAdminUsersHandler, postAdminHandler, updateAdminHandler, deleteAdminHandler} from "../controllers/adminDashboard/adminManagementController";
import { requireAdmin } from "../middlewares/requireAdmin";


const router = express.Router();

router.get("/recent-users", requireAdmin, getRecentUsersHandler);
router.get("/paginated-users", requireAdmin, getPaginatedUsersHandler);
router.get("/admin-users", requireAdmin, getAdminUsersHandler);
router.post("/create-admin", requireAdmin, postAdminHandler);
router.put("/update-admin/:userId", requireAdmin, updateAdminHandler);
router.delete("/delete-admin/:userId", requireAdmin, deleteAdminHandler);
router.post("/add-user", requireAdmin, addUserHandler);

export default router;