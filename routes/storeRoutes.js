import { Router } from "express";
import {
    addProduct,
    index,
    metric,
    products,
    show,
    store,
    update
} from "../controllers/storeController.js";
import { requireAuth, requireSeller } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", index);
router.post("/", requireAuth, requireSeller, store);
router.get("/:id", show);
router.put("/:id", requireAuth, requireSeller, update);
router.get("/:id/products", products);
router.post("/:id/products", requireAuth, requireSeller, addProduct);
router.post("/:id/metrics", metric);

export default router;
