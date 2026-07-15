import { Router } from "express";
import { destroy, index, store } from "../controllers/favoriteController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, index);
router.post("/:productId", requireAuth, store);
router.delete("/:productId", requireAuth, destroy);

export default router;
