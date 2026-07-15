import { Router } from "express";
import { index, store } from "../controllers/discountController.js";
import { requireAuth, requireSeller } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", index);
router.post("/", requireAuth, requireSeller, store);

export default router;
