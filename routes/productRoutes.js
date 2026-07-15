import { Router } from "express";
import { destroy, show, update } from "../controllers/productController.js";
import { requireAuth, requireSeller } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/:id", show);
router.put("/:id", requireAuth, requireSeller, update);
router.delete("/:id", requireAuth, requireSeller, destroy);

export default router;
