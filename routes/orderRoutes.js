import { Router } from "express";
import { mine, store } from "../controllers/orderController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/my", requireAuth, mine);
router.post("/", requireAuth, store);

export default router;
