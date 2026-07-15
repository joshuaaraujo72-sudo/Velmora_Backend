import { Router } from "express";
import { createOrder, getCheckoutSummary } from "../controllers/cartController.js";

const router = Router();

router.post("/checkout/summary", getCheckoutSummary);
router.post("/orders", createOrder);

export default router;
