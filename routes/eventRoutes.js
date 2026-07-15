import { Router } from "express";
import { destroy, index, show, store } from "../controllers/eventController.js";
import { requireAuth, requireSeller } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", index);
router.get("/:id", show);
router.post("/", requireAuth, requireSeller, store);
router.delete("/:id", requireAuth, requireSeller, destroy);

export default router;
