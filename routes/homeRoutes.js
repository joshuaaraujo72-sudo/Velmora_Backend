import { Router } from "express";
import { index } from "../controllers/homeController.js";

const router = Router();

router.get("/", index);

export default router;
