import { Router } from "express";
import { createUser, getUsers } from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, getUsers);
router.post("/", createUser);

export default router;
