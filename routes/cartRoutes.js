import { Router } from "express";
import { createOrder, getCheckoutSummary } from "../controllers/cartController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/checkout/summary", getCheckoutSummary);
router.post("/orders", requireAuth, createOrder);

export default router;
