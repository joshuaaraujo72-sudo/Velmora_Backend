import { Router } from "express";
import { dashboard } from "../controllers/sellerController.js";
import { requireAuth, requireSeller } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/dashboard", requireAuth, requireSeller, dashboard);

export default router;
